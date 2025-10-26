
import "dotenv/config"
import { addHours } from "date-fns"
import { AuthApiError, createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error("Missing Supabase environment variables.")
  process.exit(1)
}

const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

type SeedUser = {
  email: string
  password: string
  role: "student" | "teacher"
  displayName: string
}

async function findUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (error) {
    throw error
  }
  return data.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase()
  )
}

async function ensureUser(seedUser: SeedUser) {
  const metadata = {
    role: seedUser.role,
    display_name: seedUser.displayName,
  }

  let user = null
  try {
    const { data } = await supabase.auth.admin.createUser({
      email: seedUser.email,
      password: seedUser.password,
      email_confirm: true,
      user_metadata: metadata,
    })
    user = data.user
  } catch (error) {
    if (
      error instanceof AuthApiError &&
      error.status === 422
    ) {
      user = await findUserByEmail(seedUser.email)
    } else {
      throw error
    }
  }

  if (!user) {
    throw new Error(`Unable to create or fetch user ${seedUser.email}`)
  }

  await supabase.from("profiles").upsert({
    user_id: user.id,
    display_name: seedUser.displayName,
    role: seedUser.role,
  })

  return user.id
}

async function seedUsers() {
  const teacherId = await ensureUser({
    email: "demo.teacher@redflow.dev",
    password: "demo-teacher-123",
    role: "teacher",
    displayName: "Docente Demo",
  })

  const studentId = await ensureUser({
    email: "demo.student@redflow.dev",
    password: "demo-student-123",
    role: "student",
    displayName: "Estudiante Demo",
  })

  return { teacherId, studentId }
}

async function seedLabItems() {
  const items = [
    {
      name: "Multimetro digital Fluke 117",
      code: "EQ-MULT-01",
      category: "medicion",
      stock: 8,
      spec_summary: "Multimetro True RMS con deteccion automatica.",
      datasheet_url: "https://content.fluke.com/manuals/117_____umeng0100.pdf",
    },
    {
      name: "Fuente de alimentacion Rigol DP832",
      code: "EQ-PSU-02",
      category: "fuente",
      stock: 4,
      spec_summary: "Fuente programable 3 canales 30V/3A.",
      datasheet_url: "https://www.rigolna.com/products/dc-power/dp800/",
    },
    {
      name: "Osciloscopio Tektronix MDO3054",
      code: "EQ-OSC-03",
      category: "osciloscopio",
      stock: 2,
      spec_summary: "Osciloscopio mixto 500 MHz 4 canales.",
      datasheet_url: "https://download.tek.com/manual/MDO3000-UserManual-EN.pdf",
    },
    {
      name: "Kit protoboard y jumpers",
      code: "EQ-KIT-04",
      category: "prototipado",
      stock: 15,
      spec_summary: "Protoboard 830 puntos con jumpers variados.",
    },
    {
      name: "Juego cables banana-caiman",
      code: "EQ-CAB-05",
      category: "accesorios",
      stock: 20,
      spec_summary: "Cables de prueba banana a caiman multicolor.",
    },
  ]

  const { error } = await supabase
    .from("lab_items")
    .upsert(items, { onConflict: "code" })

  if (error) {
    throw error
  }
}

async function seedResources() {
  const resources = [
    {
      name: "Impresora 3D Lab X",
      code: "R-3D-X",
      location: "Laboratorio de prototipado, piso 2",
      category: "impresora_3d",
      description: "Para piezas de PLA y PETG. Incluye supervisor.",
      requires_approval: true,
    },
    {
      name: "Sala de instrumentacion 1",
      code: "R-SALA-1",
      location: "Edificio Q, cuarto 105",
      category: "sala",
      description: "Sala con 8 puestos y pantalla interactiva.",
      requires_approval: false,
    },
    {
      name: "Osciloscopio compartido - Estacion A",
      code: "R-OSC-A",
      location: "Laboratorio de electronica",
      category: "equipo_medicion",
      description: "Osciloscopio de alta precision reservado por franjas.",
      requires_approval: true,
    },
  ]

  const { error } = await supabase
    .from("reservable_resources")
    .upsert(resources, { onConflict: "code" })

  if (error) {
    throw error
  }
}

async function seedDemoData(studentId: string) {
  const { data: resourceRow } = await supabase
    .from("reservable_resources")
    .select("id, requires_approval")
    .eq("code", "R-3D-X")
    .maybeSingle()

  if (resourceRow) {
    const start = addHours(new Date(), 24)
    const end = addHours(start, 2)

    const { data: existing } = await supabase
      .from("reservations")
      .select("id")
      .eq("student_id", studentId)
      .eq("resource_id", resourceRow.id)
      .gte("start_at", start.toISOString())
      .maybeSingle()

    if (!existing) {
      await supabase.from("reservations").insert({
        resource_id: resourceRow.id,
        student_id: studentId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: resourceRow.requires_approval ? "pending" : "approved",
      })
    }
  }

  const { data: itemRow } = await supabase
    .from("lab_items")
    .select("id")
    .eq("code", "EQ-MULT-01")
    .maybeSingle()

  if (itemRow) {
    const { data: request } = await supabase
      .from("loan_requests")
      .insert({
        student_id: studentId,
        purpose: "Practica de metrologia demo",
        status: "pending",
      })
      .select("id")
      .single()

    if (request) {
      await supabase.from("loan_request_items").insert({
        request_id: request.id,
        item_id: itemRow.id,
        quantity: 1,
      })
    }
  }
}

async function main() {
  try {
    const { studentId } = await seedUsers()
    await seedLabItems()
    await seedResources()
    await seedDemoData(studentId)
    console.log("Seed completado.")
  } catch (error) {
    console.error("Error en seed:", error)
    process.exit(1)
  }
}

main()
