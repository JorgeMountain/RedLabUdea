import { requireRole } from "@/lib/auth"
import { RequestTable, type RequestRecord } from "@/components/RequestTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function TeacherRequestsPage() {
  const { supabase, profile } = await requireRole("teacher")

  const { data: requestRows } = await supabase
    .from("loan_requests")
    .select(
      `
        id,
        purpose,
        status,
        created_at,
        decided_at,
        student_id,
        loan_request_items (
          id,
          quantity,
          lab_items (
            name,
            code
          )
        )
      `
    )
    .order("created_at", { ascending: false })

  const studentIds = Array.from(
    new Set(
      (requestRows ?? [])
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

    profiles?.forEach((student) => {
      profilesMap.set(student.user_id, student.display_name)
    })
  }

  const requestData: RequestRecord[] =
    requestRows?.map((row) => ({
      id: row.id,
      purpose: row.purpose,
      status: row.status,
      created_at: row.created_at,
      decided_at: row.decided_at,
      student: {
        id: row.student_id,
        name: profilesMap.get(row.student_id) ?? row.student_id.slice(0, 8),
      },
      items:
        row.loan_request_items?.map((item) => ({
          id: item.id,
          name: item.lab_items?.name ?? "Equipo",
          code: item.lab_items?.code,
          quantity: item.quantity,
        })) ?? [],
    })) ?? []

  const pendingCount = requestData.filter((request) => request.status === "pending").length

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Bandeja de solicitudes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Bienvenido {profile.display_name ?? "docente"}. Gestiona las solicitudes de prestamo y actualiza el inventario.
          </p>
          <p>
            Solicitudes pendientes: <span className="font-semibold text-foreground">{pendingCount}</span>
          </p>
        </CardContent>
      </Card>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Solicitudes de prestamo</h2>
        <RequestTable data={requestData} mode="teacher" />
      </section>
    </div>
  )
}
