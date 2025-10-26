import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { AppHeader } from "@/components/app-header"
import { Toaster } from "@/components/ui/sonner"
import { getUserProfile } from "@/lib/auth"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "RedFlow UdeA",
  description:
    "Gestion de inventario, prestamos y reservas del laboratorio RedLab UdeA",
}

export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const authContext = await getUserProfile()

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-muted/30 antialiased`}
      >
        <AppHeader profile={authContext?.profile} />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
