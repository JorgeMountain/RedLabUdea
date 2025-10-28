import { requireRole } from "@/lib/auth"
import { LoanRequestForm } from "./loan-request-form"
import { RequestTable, type RequestRecord } from "@/components/RequestTable"
import { Separator } from "@/components/ui/separator"
import { ItemCard } from "@/components/ItemCard"
import type {
  LabItemRow,
  LoanRequestItemRow,
  LoanRequestRow,
} from "@/types/database"

type LoanRequestWithItems = LoanRequestRow & {
  loan_request_items: (LoanRequestItemRow & {
    lab_items: Pick<LabItemRow, "name" | "code"> | null
  })[] | null
}

type RequestsPageProps = {
  searchParams?: Promise<{
    add?: string
  }>
}

export default async function RequestsPage({
  searchParams,
}: RequestsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const { supabase, user } = await requireRole("student")

  const [{ data: items }, { data: requestRows }] = await Promise.all([
    supabase
      .from("lab_items")
      .select("*")
      .order("name", { ascending: true })
      .returns<LabItemRow[]>(),
    supabase
      .from("loan_requests")
      .select(
        `
          id,
          purpose,
          status,
          created_at,
          decided_at,
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
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .returns<LoanRequestWithItems[]>(),
  ])

  const mappedItems =
    items?.map((item) => ({
      id: item.id,
      name: item.name,
      stock: item.stock,
      code: item.code,
    })) ?? []

  const selectedItem =
    mappedItems.find((item) => item.id === resolvedSearchParams.add) ?? null

  const requestData: RequestRecord[] =
    requestRows?.map((row) => ({
      id: row.id,
      purpose: row.purpose,
      status: row.status,
      created_at: row.created_at,
      decided_at: row.decided_at,
      items:
        row.loan_request_items?.map((item) => ({
          id: item.id,
          name: item.lab_items?.name ?? "Equipo",
          code: item.lab_items?.code,
          quantity: item.quantity,
        })) ?? [],
    })) ?? []

  return (
    <div className="space-y-10">
      <LoanRequestForm
        key={resolvedSearchParams.add ?? "default"}
        items={mappedItems}
        initialItemId={selectedItem?.id}
        initialSelection={
          selectedItem ? [{ itemId: selectedItem.id, quantity: 1 }] : undefined
        }
      />

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Mis solicitudes</h2>
        <RequestTable data={requestData} mode="student" />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Equipos destacados</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(items ?? []).slice(0, 6).map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
