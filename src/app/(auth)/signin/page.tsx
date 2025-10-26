import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthTabs } from "./auth-tabs"

export default async function SignInPage() {
  const context = await getUserProfile()
  if (context) {
    if (context.profile.role === "teacher") {
      redirect("/teacher/admin/requests")
    } else {
      redirect("/catalog")
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold">
            Bienvenido a RedFlow UdeA
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestiona el prestamo de equipos y las reservas del laboratorio.
          </p>
        </CardHeader>
        <CardContent>
          <AuthTabs />
        </CardContent>
      </Card>
    </div>
  )
}
