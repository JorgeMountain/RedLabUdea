import type { ReactNode } from "react"
import Link from "next/link"
import { CalendarIcon, CheckCircle2Icon, ShieldQuestionIcon } from "lucide-react"
import { ReservableResourceRow } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ResourceCardProps = {
  resource: ReservableResourceRow
  actionSlot?: ReactNode
  showReserveButton?: boolean
}

export function ResourceCard({
  resource,
  actionSlot,
  showReserveButton = false,
}: ResourceCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{resource.name}</span>
          <Badge variant="outline">
            {resource.category ?? "Recurso"}
          </Badge>
        </CardTitle>
        {resource.code ? (
          <p className="text-sm text-muted-foreground">Codigo: {resource.code}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {resource.description ? <p>{resource.description}</p> : null}
        {resource.location ? (
          <p>
            <CalendarIcon className="mr-2 inline-block size-4 text-primary" />
            Ubicacion: {resource.location}
          </p>
        ) : null}
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
          {resource.requires_approval ? (
            <>
              <ShieldQuestionIcon className="size-4 text-amber-600" />
              Requiere aprobacion
            </>
          ) : (
            <>
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              Autoaprobada
            </>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        {actionSlot ??
          (showReserveButton ? (
            <Button className="w-full" asChild>
              <Link href="/reservations">Reservar</Link>
            </Button>
          ) : null)}
      </CardFooter>
    </Card>
  )
}
