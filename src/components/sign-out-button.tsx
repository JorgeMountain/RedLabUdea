"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [isPending, startTransition] = useTransition()

  const handleSignOut = () => {
    startTransition(async () => {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error("No se pudo cerrar sesion.")
        return
      }
      router.replace("/signin")
      router.refresh()
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      disabled={isPending}
    >
      {isPending ? "Cerrando..." : "Cerrar sesion"}
    </Button>
  )
}
