import { requireRole } from "@/lib/auth"
import { AddResourceForm, ResourceTable } from "./resource-forms"
import { Separator } from "@/components/ui/separator"

export default async function AdminResourcesPage() {
  const { supabase } = await requireRole("teacher")

  const { data: resources } = await supabase
    .from("reservable_resources")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-8">
      <AddResourceForm />
      <Separator />
      <ResourceTable resources={resources ?? []} />
    </div>
  )
}
