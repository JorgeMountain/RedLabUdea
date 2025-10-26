import Link from "next/link"
import { requireRole } from "@/lib/auth"
import { ItemCard } from "@/components/ItemCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default async function CatalogPage() {
  const { supabase, profile } = await requireRole("student")

  const { data: items } = await supabase
    .from("lab_items")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Hola {profile.display_name ?? "estudiante"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Explora el inventario disponible y arma tu solicitud de prestamo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Busca por nombre o categoria (Ctrl+F)..."
            className="hidden w-64 md:block"
            readOnly
          />
          <Button asChild>
            <Link href="/requests">Ver mis solicitudes</Link>
          </Button>
        </div>
      </header>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(items ?? []).map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
        {items?.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Aun no hay equipos registrados.
          </p>
        ) : null}
      </section>
    </div>
  )
}
