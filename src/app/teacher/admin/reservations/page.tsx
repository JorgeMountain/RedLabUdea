import { requireRole } from "@/lib/auth"
import {
  ReservationTable,
  type ReservationRecord,
} from "@/components/ReservationTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function TeacherReservationsPage() {
  const { supabase, profile } = await requireRole("teacher")

  const { data: reservationRows } = await supabase
    .from("reservations")
    .select(
      `
        id,
        status,
        start_at,
        end_at,
        student_id,
        reservable_resources (
          id,
          name,
          requires_approval
        )
      `
    )
    .order("start_at", { ascending: false })

  const studentIds = Array.from(
    new Set(
      (reservationRows ?? [])
        .map((row) => row.student_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const profilesMap = new Map<string, string | null>()
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", studentIds)

    profiles?.forEach((student) =>
      profilesMap.set(student.user_id, student.display_name)
    )
  }

  const reservationData: ReservationRecord[] =
    reservationRows?.map((row) => ({
      id: row.id,
      status: row.status,
      start_at: row.start_at,
      end_at: row.end_at,
      resource: {
        id: row.reservable_resources?.id ?? "",
        name: row.reservable_resources?.name ?? "Recurso",
        requires_approval: row.reservable_resources?.requires_approval ?? true,
      },
      student: {
        id: row.student_id,
        name: profilesMap.get(row.student_id) ?? row.student_id.slice(0, 8),
      },
    })) ?? []

  const pending = reservationData.filter(
    (reservation) => reservation.status === "pending"
  ).length

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Reservas por aprobar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Hola {profile.display_name ?? "docente"}. Revisa y aprueba las reservas pendientes del laboratorio.
          </p>
          <p>
            Pendientes:{" "}
            <span className="font-semibold text-foreground">{pending}</span>
          </p>
        </CardContent>
      </Card>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Reservas</h2>
        <ReservationTable data={reservationData} mode="teacher" />
      </section>
    </div>
  )
}
