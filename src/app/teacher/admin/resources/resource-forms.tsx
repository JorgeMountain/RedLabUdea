"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createResourceAction, updateResourceAction } from "@/actions/resources"
import { ReservableResourceRow } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const resourceSchema = z.object({
  name: z.string().min(3, "Ingresa un nombre valido."),
  code: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  requires_approval: z.boolean(),
})

type ResourceFormValues = z.infer<typeof resourceSchema>

export function AddResourceForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: "",
      code: "",
      location: "",
      category: "",
      description: "",
      requires_approval: true,
    },
  })

  const onSubmit = (values: ResourceFormValues) => {
    startTransition(async () => {
      try {
        await createResourceAction(values)
        toast.success("Recurso registrado.")
        form.reset({
          name: "",
          code: "",
          location: "",
          category: "",
          description: "",
          requires_approval: true,
        })
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "No se pudo registrar el recurso."
        )
      }
    })
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg">Nuevo recurso reservable</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2 md:col-span-2">
            <Label>Nombre</Label>
            <Input placeholder="Impresora 3D Lab X" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Codigo</Label>
            <Input placeholder="R-3D-X" {...form.register("code")} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input placeholder="impresora_3d" {...form.register("category")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Ubicacion</Label>
            <Input placeholder="Laboratorio X, piso 2" {...form.register("location")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descripcion</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Detalles relevantes, capacidades, restricciones."
              {...form.register("description")}
            />
          </div>
          <Controller
            control={form.control}
            name="requires_approval"
            render={({ field }) => (
              <div className="flex items-center gap-2 md:col-span-2">
                <Checkbox
                  id="requires_approval"
                  checked={field.value}
                  onCheckedChange={(value) =>
                    field.onChange(Boolean(value))
                  }
                />
                <Label htmlFor="requires_approval">
                  Requiere aprobacion del docente
                </Label>
              </div>
            )}
          />
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Agregar recurso"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

type ResourceTableProps = {
  resources: ReservableResourceRow[]
}

export function ResourceTable({ resources }: ResourceTableProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recursos registrados</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recurso</TableHead>
              <TableHead>Ubicacion</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No hay recursos registrados.
                </TableCell>
              </TableRow>
            ) : (
              resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="max-w-[220px]">
                    <div className="font-medium">{resource.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {resource.description ?? "Sin descripcion."}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {resource.location ?? "Sin ubicacion"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {resource.category ?? "general"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={resource.requires_approval ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}>
                      {resource.requires_approval ? "Con aprobacion" : "Autoaprobada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <EditResourceDialog resource={resource} />
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

function EditResourceDialog({ resource }: { resource: ReservableResourceRow }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: resource.name,
      code: resource.code ?? "",
      location: resource.location ?? "",
      category: resource.category ?? "",
      description: resource.description ?? "",
      requires_approval: resource.requires_approval ?? true,
    },
  })

  const onSubmit = (values: ResourceFormValues) => {
    startTransition(async () => {
      try {
        await updateResourceAction({
          id: resource.id,
          ...values,
        })
        toast.success("Recurso actualizado.")
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "No se pudo actualizar el recurso."
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
          <DialogTitle>Editar recurso</DialogTitle>
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
          </div>
          <div className="space-y-2">
            <Label>Ubicacion</Label>
            <Input {...form.register("location")} />
          </div>
          <div className="space-y-2">
            <Label>Descripcion</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              {...form.register("description")}
            />
          </div>
          <Controller
            control={form.control}
            name="requires_approval"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`approval-${resource.id}`}
                  checked={field.value}
                  onCheckedChange={(value) =>
                    field.onChange(Boolean(value))
                  }
                />
                <Label htmlFor={`approval-${resource.id}`}>
                  Requiere aprobacion del docente
                </Label>
              </div>
            )}
          />
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
