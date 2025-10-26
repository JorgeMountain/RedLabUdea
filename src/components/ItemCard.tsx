import type { ReactNode } from "react"
import Link from "next/link"
import { LabItemRow } from "@/types/database"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ItemCardProps = {
  item: LabItemRow
  actionSlot?: ReactNode
}

export function ItemCard({ item, actionSlot }: ItemCardProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{item.name}</span>
          <Badge variant="outline">{item.category ?? "General"}</Badge>
        </CardTitle>
        {item.code ? (
          <p className="text-sm text-muted-foreground">Codigo: {item.code}</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
        <p>{item.spec_summary ?? "Sin descripcion."}</p>
        <p>
          Stock disponible:{" "}
          <span className="font-medium text-foreground">{item.stock}</span>
        </p>
        {item.datasheet_url ? (
          <Link
            href={item.datasheet_url}
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            Ver datasheet
          </Link>
        ) : null}
      </CardContent>
      <CardFooter className="mt-auto">
        {actionSlot ?? (
          <Button
            className="w-full"
            asChild
            disabled={item.stock === 0}
          >
            <Link href={`/requests?add=${item.id}`}>
              {item.stock === 0
                ? "Sin stock"
                : "Agregar a solicitud"}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
