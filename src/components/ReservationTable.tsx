"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  reservationApproveAction,
  reservationCancelAction,
  reservationMarkDoneAction,
  reservationRejectAction,
} from "@/actions/reservations"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type ReservationRecord = {
  id: string
  status: "pending" | "approved" | "rejected" | "cancelled" | "done"
  start_at: string
  end_at: string
  resource: {
    id: string
    name: string
    requires_approval: boolean | null
  }
  student?: { id: string; name: string | null }
}

type ReservationTableProps = {
  data: ReservationRecord[]
  mode: "student" | "teacher"
}

const statusLabels: Record<ReservationRecord["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  done: "Realizada",
}

const statusClasses: Record<ReservationRecord["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-200 text-slate-700",
  done: "bg-blue-100 text-blue-700",
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export function ReservationTable({ data, mode }: ReservationTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const runAction = async (
    id: string,
    action: (id: string) => Promise<void>,
    success: string
  ) => {
    startTransition(async () => {
      setPendingId(id)
      try {
        await action(id)
        toast.success(success)
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error ? error.message : "Error al procesar la accion."
        )
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recurso</TableHead>
          <TableHead>Horario</TableHead>
          <TableHead>Estado</TableHead>
          {mode === "teacher" ? <TableHead>Alumno</TableHead> : null}
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={mode === "teacher" ? 5 : 4}
              className="text-center text-sm text-muted-foreground"
            >
              No hay reservas registradas.
            </TableCell>
          </TableRow>
        ) : (
          data.map((reservation) => (
            <TableRow key={reservation.id}>
              <TableCell className="align-top">
                <div className="font-medium">{reservation.resource.name}</div>
                <div className="text-xs text-muted-foreground">
                  {reservation.resource.requires_approval
                    ? "Requiere aprobacion"
                    : "Autoaprobada"}
                </div>
              </TableCell>
              <TableCell className="align-top text-sm">
                <div>{formatDateTime(reservation.start_at)}</div>
                <div className="text-xs text-muted-foreground">
                  hasta {formatDateTime(reservation.end_at)}
                </div>
              </TableCell>
              <TableCell className="align-top">
                <Badge className={statusClasses[reservation.status]}>
                  {statusLabels[reservation.status]}
                </Badge>
              </TableCell>
              {mode === "teacher" ? (
                <TableCell className="align-top text-sm text-muted-foreground">
                  {reservation.student?.name ?? "Sin perfil"}
                </TableCell>
              ) : null}
              <TableCell className="align-top text-right">
                {mode === "teacher" ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        isPending ||
                        pendingId === reservation.id ||
                        reservation.status !== "pending"
                      }
                      onClick={() =>
                        runAction(
                          reservation.id,
                          reservationApproveAction,
                          "Reserva aprobada."
                        )
                      }
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        isPending ||
                        pendingId === reservation.id ||
                        reservation.status !== "pending"
                      }
                      onClick={() =>
                        runAction(
                          reservation.id,
                          reservationRejectAction,
                          "Reserva rechazada."
                        )
                      }
                    >
                      Rechazar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        isPending ||
                        pendingId === reservation.id ||
                        reservation.status !== "approved"
                      }
                      onClick={() =>
                        runAction(
                          reservation.id,
                          reservationMarkDoneAction,
                          "Reserva marcada como realizada."
                        )
                      }
                    >
                      Finalizar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      isPending ||
                      pendingId === reservation.id ||
                      !["pending", "approved"].includes(reservation.status)
                    }
                    onClick={() =>
                      runAction(
                        reservation.id,
                        reservationCancelAction,
                        "Reserva cancelada."
                      )
                    }
                  >
                    Cancelar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
