import { requireRole } from "@/lib/auth"
import { ReservationForm } from "./reservation-form"
import {
  ReservationTable,
  type ReservationRecord,
} from "@/components/ReservationTable"
import { ResourceCard } from "@/components/ResourceCard"
import { Separator } from "@/components/ui/separator"

export default async function StudentReservationsPage() {
  const { supabase, user } = await requireRole("student")

  const [{ data: resources }, { data: reservationRows }] = await Promise.all([
    supabase
      .from("reservable_resources")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("reservations")
      .select(
        `
        id,
        status,
        start_at,
        end_at,
        reservable_resources (
          id,
          name,
          requires_approval
        )
      `
      )
      .eq("student_id", user.id)
      .order("start_at", { ascending: false }),
  ])

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
    })) ?? []

  return (
    <div className="space-y-10">
      <ReservationForm
        resources={
          resources?.map((resource) => ({
            id: resource.id,
            name: resource.name,
            requires_approval: resource.requires_approval,
          })) ?? []
        }
      />

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Mis reservas</h2>
        <ReservationTable data={reservationData} mode="student" />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recursos disponibles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(resources ?? []).map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              showReserveButton
            />
          ))}
        </div>
      </section>
    </div>
  )
}
