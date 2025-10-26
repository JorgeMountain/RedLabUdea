"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FlameIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/sign-out-button"

type AppHeaderProps = {
  profile?: {
    display_name: string | null
    role: "student" | "teacher"
  } | null
}

const studentNav = [
  { href: "/catalog", label: "Catalogo" },
  { href: "/requests", label: "Mis prestamos" },
  { href: "/reservations", label: "Mis reservas" },
]

const teacherNav = [
  { href: "/teacher/admin/requests", label: "Solicitudes" },
  { href: "/teacher/admin/reservations", label: "Reservas" },
  { href: "/teacher/admin/items", label: "Inventario" },
  { href: "/teacher/admin/resources", label: "Recursos" },
]

export function AppHeader({ profile }: AppHeaderProps) {
  const pathname = usePathname()
  const nav =
    profile?.role === "teacher" ? teacherNav : profile ? studentNav : []

  return (
    <header className="sticky top-0 z-30 border-b bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <Link
          href={profile?.role === "teacher" ? "/teacher/admin/requests" : "/catalog"}
          className="flex items-center gap-2"
        >
          <FlameIcon className="size-5 text-primary" />
          <span className="font-semibold">RedFlow UdeA</span>
        </Link>
        {nav.length > 0 ? (
          <nav className="hidden items-center gap-4 text-sm md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition hover:text-primary",
                  pathname.startsWith(item.href)
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <div />
        )}
        {profile ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-medium leading-none">
                {profile.display_name ?? "Usuario"}
              </div>
              <div className="text-muted-foreground">
                Rol:{" "}
                <Badge variant="secondary" className="uppercase">
                  {profile.role}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SignOutButton />
            </div>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link href="/signin">Iniciar sesion</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
