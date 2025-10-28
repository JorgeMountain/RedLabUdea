"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { createBrowserSupabaseClient } from "@/lib/supabase/browser"
import type { ProfileRow } from "@/types/database"

const signInSchema = z.object({
  email: z.string().email("Ingresa un correo valido"),
  password: z.string().min(6, "La contrasena debe tener al menos 6 caracteres"),
})

const signUpSchema = signInSchema.extend({
  displayName: z.string().min(3, "Ingresa tu nombre completo"),
  role: z.enum(["student", "teacher"]),
})

type SignInFormValues = z.infer<typeof signInSchema>
type SignUpFormValues = z.infer<typeof signUpSchema>

export function AuthTabs() {
  return (
    <Tabs defaultValue="signin" className="space-y-6">
      <TabsList className="grid grid-cols-2">
        <TabsTrigger value="signin">Iniciar sesion</TabsTrigger>
        <TabsTrigger value="signup">Registrarse</TabsTrigger>
      </TabsList>
      <TabsContent value="signin">
        <SignInForm />
      </TabsContent>
      <TabsContent value="signup">
        <SignUpForm />
      </TabsContent>
    </Tabs>
  )
}

function SignInForm() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [isPending, startTransition] = useTransition()

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = (values: SignInFormValues) => {
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword(values)
      if (error) {
        toast.error("Credenciales invalidas.")
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast.error("No se pudo recuperar el usuario.")
        return
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle<ProfileRow>()

      const metadataDisplayName =
        typeof user.user_metadata?.display_name === "string"
          ? user.user_metadata.display_name
          : null
      const displayName = metadataDisplayName ?? user.email ?? ""
      let resolvedRole: "student" | "teacher" =
        existingProfile?.role ??
        (user.user_metadata?.role === "teacher" ? "teacher" : "student")

      if (!existingProfile) {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          display_name: displayName,
          role: resolvedRole,
        })
      } else {
        resolvedRole = existingProfile.role
        if (
          metadataDisplayName &&
          metadataDisplayName.trim().length > 0 &&
          existingProfile.display_name !== metadataDisplayName
        ) {
          await supabase
            .from("profiles")
            .update({ display_name: metadataDisplayName })
            .eq("user_id", user.id)
        }
      }

      router.replace(
        resolvedRole === "teacher"
          ? "/teacher/admin/requests"
          : "/catalog"
      )
      router.refresh()
      toast.success("Sesion iniciada.")
    })
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Correo institucional</Label>
        <Input
          type="email"
          placeholder="nombre@udea.edu.co"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Contrasena</Label>
        <Input
          type="password"
          placeholder="******"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Ingresando..." : "Ingresar"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Olvidaste tu contrasena?{" "}
        <Link href="https://supabase.com/auth" className="underline">
          Recuperar
        </Link>
      </p>
    </form>
  )
}

function SignUpForm() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [isPending, startTransition] = useTransition()

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
      role: "student",
    },
  })

  const onSubmit = (values: SignUpFormValues) => {
    startTransition(async () => {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            display_name: values.displayName,
            role: values.role,
          },
        },
      })

      if (error || !data.user) {
        console.error(error)
        toast.error("No se pudo crear la cuenta.")
        return
      }

      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        display_name: values.displayName,
        role: values.role,
      })

      toast.success("Cuenta creada. Inicia sesion para continuar.")
      router.refresh()
    })
  }

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Nombre visible</Label>
        <Input
          placeholder="Ing. Juan Perez"
          {...form.register("displayName")}
        />
        {form.formState.errors.displayName ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.displayName.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Rol</Label>
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(value) =>
                field.onChange(value as SignUpFormValues["role"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Estudiante</SelectItem>
                <SelectItem value="teacher">Docente</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Correo</Label>
        <Input
          type="email"
          placeholder="nombre@udea.edu.co"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Contrasena</Label>
        <Input
          type="password"
          placeholder="******"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creando..." : "Crear cuenta"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Al registrarte aceptas las politicas de uso del laboratorio.
      </p>
    </form>
  )
}
