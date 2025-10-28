"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createLabItemAction, updateLabItemAction } from "@/actions/items"
import { LabItemRow } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const baseSchema = z.object({
  name: z.string().min(3, "Ingresa un nombre valido."),
  code: z.string().optional(),
  category: z.string().optional(),
  stock: z.number().int().min(0),
  spec_summary: z.string().optional(),
  datasheet_url: z.string().url("Ingresa una URL valida.").optional().or(z.literal("")),
})

type AddFormValues = z.infer<typeof baseSchema>

type EditFormValues = AddFormValues

export function AddItemForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<AddFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: "",
      code: "",
      category: "",
      stock: 1,
      spec_summary: "",
      datasheet_url: "",
    },
  })

  const onSubmit = (values: AddFormValues) => {
    startTransition(async () => {
      try {
        await createLabItemAction({
          ...values,
          datasheet_url: values.datasheet_url || undefined,
        })
        toast.success("Equipo agregado al inventario.")
        form.reset({
          name: "",
          code: "",
          category: "",
          stock: 1,
          spec_summary: "",
          datasheet_url: "",
        })
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "No se pudo crear el item."
        )
      }
    })
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Registrar nuevo equipo</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="md:col-span-2 space-y-2">
            <Label>Nombre</Label>
            <Input placeholder="Osciloscopio Rigol" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Codigo</Label>
            <Input placeholder="EQ-001" {...form.register("code")} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input placeholder="medicion" {...form.register("category")} />
          </div>
          <div className="space-y-2">
            <Label>Stock disponible</Label>
            <Input
              type="number"
              min={0}
              {...form.register("stock", { valueAsNumber: true })}
            />
            {form.formState.errors.stock ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.stock.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Resumen tecnico</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Breve descripcion del equipo o accesorios incluidos."
              {...form.register("spec_summary")}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>URL datasheet (opcional)</Label>
            <Input placeholder="https://..." {...form.register("datasheet_url")} />
            {form.formState.errors.datasheet_url ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.datasheet_url.message}
              </p>
            ) : null}
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Agregar equipo"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

type InventoryTableProps = {
  items: LabItemRow[]
}

export function InventoryTable({ items }: InventoryTableProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Inventario actual</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No hay equipos registrados.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[220px]">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.spec_summary ?? "Sin descripcion."}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {item.category ?? "General"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{item.stock}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.code ?? "Sin codigo"}
                  </TableCell>
                  <TableCell className="text-right">
                    <EditItemDialog item={item} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function EditItemDialog({ item }: { item: LabItemRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<EditFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      name: item.name,
      code: item.code ?? "",
      category: item.category ?? "",
      stock: item.stock,
      spec_summary: item.spec_summary ?? "",
      datasheet_url: item.datasheet_url ?? "",
    } as EditFormValues,
  })

  const onSubmit = (values: EditFormValues) => {
    startTransition(async () => {
      try {
        await updateLabItemAction({
          id: item.id,
          ...values,
          datasheet_url: values.datasheet_url || undefined,
        })
        toast.success("Equipo actualizado.")
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "No se pudo actualizar el equipo."
        )
      }
    })
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar equipo</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Codigo</Label>
              <Input {...form.register("code")} />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input {...form.register("category")} />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input
                type="number"
                min={0}
                {...form.register("stock", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Datasheet</Label>
              <Input {...form.register("datasheet_url")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Resumen</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("spec_summary")}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
