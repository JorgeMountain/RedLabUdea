"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createLoanRequestAction } from "@/actions/requests"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type FormValues = {
  purpose: string
}

type LoanRequestFormProps = {
  items: {
    id: string
    name: string
    stock: number
    code?: string | null
  }[]
  initialItemId?: string
  initialSelection?: SelectedItem[]
}

type SelectedItem = {
  itemId: string
  quantity: number
}

const purposeSchema = z.object({
  purpose: z.string().min(3, "Describe brevemente el uso que daras al equipo."),
})

export function LoanRequestForm({
  items,
  initialItemId,
  initialSelection,
}: LoanRequestFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState(
    initialSelection?.[0]?.itemId ?? initialItemId ?? ""
  )
  const [quantity, setQuantity] = useState("1")
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>(
    () => initialSelection ?? []
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(purposeSchema),
    defaultValues: { purpose: "" },
  })

  const availableItems = useMemo(
    () =>
      items.filter((item) => item.stock > 0 || selectedItems.some((s) => s.itemId === item.id)),
    [items, selectedItems]
  )

  const handleAddItem = () => {
    if (!selectedId) {
      toast.error("Selecciona un item del catalogo.")
      return
    }
    const item = items.find((item) => item.id === selectedId)
    if (!item) {
      toast.error("No se encontro el item seleccionado.")
      return
    }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error("Cantidad invalida.")
      return
    }
    if (item.stock < qty) {
      toast.error("La cantidad supera el stock disponible.")
      return
    }
    setSelectedItems((prev) => {
      const existing = prev.find((entry) => entry.itemId === selectedId)
      if (existing) {
        if (existing.quantity + qty > item.stock) {
          toast.error("La suma supera el stock disponible.")
          return prev
        }
        const updated = prev.map((entry) =>
          entry.itemId === selectedId
            ? { ...entry, quantity: entry.quantity + qty }
            : entry
        )
        return updated
      }
      return [...prev, { itemId: selectedId, quantity: qty }]
    })
    setQuantity("1")
  }

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.itemId !== itemId))
  }

  const onSubmit = (values: FormValues) => {
    if (selectedItems.length === 0) {
      toast.error("Agrega al menos un equipo a la solicitud.")
      return
    }
    startTransition(async () => {
      try {
        await createLoanRequestAction({
          purpose: values.purpose,
          items: selectedItems,
        })
        toast.success("Solicitud enviada.")
        setSelectedItems([])
        form.reset()
        router.replace("/requests")
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "No se pudo crear la solicitud."
        )
      }
    })
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Nueva solicitud de prestamo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-2">
            <Label htmlFor="purpose">Proposito</Label>
            <Input
              id="purpose"
              placeholder="Ej: Laboratorio de electronica II"
              {...form.register("purpose")}
            />
            {form.formState.errors.purpose ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.purpose.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select
                value={selectedId}
                onValueChange={(value) => setSelectedId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un equipo" />
                </SelectTrigger>
                <SelectContent>
                  {availableItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.stock} disp.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleAddItem}
                disabled={isPending || items.length === 0}
              >
                Agregar
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipo</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-sm text-muted-foreground"
                    >
                      Aun no agregas equipos.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedItems.map((item) => {
                    const ref = items.find((catalogItem) => catalogItem.id === item.itemId)
                    return (
                      <TableRow key={item.itemId}>
                        <TableCell>{ref?.name ?? "Equipo"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(item.itemId)}
                          >
                            Quitar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <CardFooter className="flex justify-end px-0">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
