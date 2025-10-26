"use client"

import { FormEvent, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addHours, formatISO, setMinutes } from "date-fns"
import { toast } from "sonner"
import { reservationCreateAction } from "@/actions/reservations"
import { DateTimeRangePicker } from "@/components/DateTimeRangePicker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ReservationFormProps = {
  resources: {
    id: string
    name: string
    requires_approval: boolean | null
  }[]
}

const toLocalInput = (date: Date) => {
  const iso = formatISO(date, { representation: "complete" })
  return iso.slice(0, 16)
}

export function ReservationForm({ resources }: ReservationFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const defaultStart = useMemo(() => {
    const now = new Date()
    const nextSlot =
      now.getMinutes() < 30
        ? setMinutes(now, 30)
        : setMinutes(addHours(now, 1), 0)
    return toLocalInput(nextSlot)
  }, [])
  const [resourceId, setResourceId] = useState(resources[0]?.id ?? "")
  const [start, setStart] = useState(defaultStart)
  const [end, setEnd] = useState(() =>
    toLocalInput(addHours(new Date(defaultStart), 1))
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resourceId) {
      toast.error("Selecciona un recurso.")
      return
    }
    startTransition(async () => {
      try {
        await reservationCreateAction({
          resourceId,
          startAt: new Date(start).toISOString(),
          endAt: new Date(end).toISOString(),
        })
        toast.success("Reserva registrada.")
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "No se pudo crear la reserva."
        )
      }
    })
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Nueva reserva</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Recurso</Label>
            <Select
              value={resourceId}
              onValueChange={(value) => setResourceId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un recurso" />
              </SelectTrigger>
              <SelectContent>
                {resources.map((resource) => (
                  <SelectItem key={resource.id} value={resource.id}>
                    {resource.name}{" "}
                    {resource.requires_approval ? "(requiere aprobacion)" : "(autoaprobada)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DateTimeRangePicker
            start={start}
            end={end}
            onStartChange={(value) => {
              setStart(value)
              const startDate = new Date(value)
              if (startDate >= new Date(end)) {
                setEnd(toLocalInput(addHours(startDate, 1)))
              }
            }}
            onEndChange={(value) => setEnd(value)}
          />

          <p className="text-xs text-muted-foreground">
            Horario del laboratorio: 07:00 a 20:00 (America/Bogota). Duracion minima 30 min, maxima 4 h.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" disabled={isPending || resources.length === 0}>
            {isPending ? "Guardando..." : "Crear reserva"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
