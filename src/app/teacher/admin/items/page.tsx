import { requireRole } from "@/lib/auth"
import { AddItemForm, InventoryTable } from "./item-forms"
import { Separator } from "@/components/ui/separator"
import type { LabItemRow } from "@/types/database"

export default async function AdminItemsPage() {
  const { supabase } = await requireRole("teacher")

  const { data: items } = await supabase
    .from("lab_items")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<LabItemRow[]>()

  return (
    <div className="space-y-8">
      <AddItemForm />
      <Separator />
      <InventoryTable items={items ?? []} />
    </div>
  )
}
