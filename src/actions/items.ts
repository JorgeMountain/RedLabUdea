"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"

const itemSchema = z.object({
  name: z.string().min(3, "Ingresa un nombre valido."),
  code: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  stock: z.number().int().min(0),
  spec_summary: z.string().optional(),
  datasheet_url: z.string().url().optional().or(z.literal("")),
})

const updateSchema = itemSchema.partial().extend({
  id: z.string().uuid(),
})

function revalidateInventory() {
  revalidatePath("/catalog")
  revalidatePath("/requests")
  revalidatePath("/teacher/admin/items")
}

export async function createLabItemAction(input: unknown) {
  const { supabase } = await requireRole("teacher")
  const payload = itemSchema.parse(input)

  const { error } = await supabase.from("lab_items").insert({
    name: payload.name,
    code: payload.code,
    category: payload.category,
    stock: payload.stock,
    spec_summary: payload.spec_summary,
    datasheet_url: payload.datasheet_url || null,
  })

  if (error) {
    console.error("[items:create]", error)
    throw new Error("No se pudo crear el item.")
  }

  revalidateInventory()
}

export async function updateLabItemAction(input: unknown) {
  const { supabase } = await requireRole("teacher")
  const payload = updateSchema.parse(input)

  const updates: Record<string, unknown> = {}

  if (payload.name !== undefined) updates.name = payload.name
  if (payload.code !== undefined) updates.code = payload.code
  if (payload.category !== undefined) updates.category = payload.category
  if (payload.stock !== undefined) updates.stock = payload.stock
  if (payload.spec_summary !== undefined)
    updates.spec_summary = payload.spec_summary
  if (payload.datasheet_url !== undefined)
    updates.datasheet_url = payload.datasheet_url === "" ? null : payload.datasheet_url

  const { error } = await supabase
    .from("lab_items")
    .update(updates)
    .eq("id", payload.id)

  if (error) {
    console.error("[items:update]", error)
    throw new Error("No se pudo actualizar el item.")
  }

  revalidateInventory()
}
