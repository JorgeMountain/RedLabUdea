import { redirect } from "next/navigation"
import { getUserProfile } from "@/lib/auth"

export default async function HomePage() {
  const context = await getUserProfile()

  if (!context) {
    redirect("/signin")
  }

  if (context.profile.role === "teacher") {
    redirect("/teacher/admin/requests")
  }

  redirect("/catalog")
}
