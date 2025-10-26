"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  approveLoanRequestAction,
  rejectLoanRequestAction,
  returnLoanRequestAction,
} from "@/actions/requests"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type RequestItem = {
  id: string
  name: string
  quantity: number
  code?: string | null
}

export type RequestRecord = {
  id: string
  purpose: string | null
  status: "pending" | "approved" | "rejected" | "returned"
  created_at: string | null
  decided_at: string | null
  student?: { id: string; name: string | null }
  items: RequestItem[]
}

type RequestTableProps = {
  data: RequestRecord[]
  mode: "student" | "teacher"
}

const statusLabels: Record<RequestRecord["status"], string> = {
  approved: "Aprobada",
  pending: "Pendiente",
  rejected: "Rechazada",
  returned: "Devuelta",
}

const statusClasses: Record<RequestRecord["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  returned: "bg-blue-100 text-blue-700",
}

const formatDate = (iso: string | null) => {
  if (!iso) return "--"
  const date = new Date(iso)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

export function RequestTable({ data, mode }: RequestTableProps) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const runAction = (
    id: string,
    action: (id: string) => Promise<void>,
    successMessage: string
  ) => {
    startTransition(async () => {
      setPendingAction(id)
      try {
        await action(id)
        toast.success(successMessage)
        router.refresh()
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado."
        )
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Solicitud</TableHead>
            <TableHead>Equipos</TableHead>
            <TableHead>Creada</TableHead>
            <TableHead>Estado</TableHead>
            {mode === "teacher" ? <TableHead>Alumno</TableHead> : null}
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={mode === "teacher" ? 6 : 5}
                className="text-center text-sm text-muted-foreground"
              >
                No hay solicitudes registradas.
              </TableCell>
            </TableRow>
          ) : (
            data.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="max-w-[220px] align-top">
                  <p className="font-medium text-foreground">
                    {request.purpose ?? "Sin objetivo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {request.decided_at
                      ? `Actualizada: ${formatDate(request.decided_at)}`
                      : ""}
                  </p>
                </TableCell>
                <TableCell className="align-top text-sm">
                  <ul className="space-y-1">
                    {request.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>{item.name}</span>
                        <Badge variant="secondary">x{item.quantity}</Badge>
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell className="align-top text-sm">
                  {formatDate(request.created_at)}
                </TableCell>
                <TableCell className="align-top">
                  <Badge className={statusClasses[request.status]}>
                    {statusLabels[request.status]}
                  </Badge>
                </TableCell>
                {mode === "teacher" ? (
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {request.student?.name ?? request.student?.id ?? "Sin perfil"}
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
                          pendingAction === request.id ||
                          request.status !== "pending"
                        }
                        onClick={() =>
                          runAction(
                            request.id,
                            approveLoanRequestAction,
                            "Solicitud aprobada."
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
                          pendingAction === request.id ||
                          request.status !== "pending"
                        }
                        onClick={() =>
                          runAction(
                            request.id,
                            rejectLoanRequestAction,
                            "Solicitud rechazada."
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
                          pendingAction === request.id ||
                          request.status !== "approved"
                        }
                        onClick={() =>
                          runAction(
                            request.id,
                            returnLoanRequestAction,
                            "Equipo marcado como devuelto."
                          )
                        }
                      >
                        Devolver
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {request.status === "approved"
                        ? "Pendiente de entrega."
                        : "--"}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
