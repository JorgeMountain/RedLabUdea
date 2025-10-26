"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"

const resourceSchema = z.object({
  name: z.string().min(3, "Ingresa un nombre valido."),
  code: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  requires_approval: z.boolean().optional(),
})

const updateSchema = resourceSchema.partial().extend({
  id: z.string().uuid(),
})

function revalidateResources() {
  revalidatePath("/reservations")
  revalidatePath("/teacher/admin/resources")
}

export async function createResourceAction(input: unknown) {
  const { supabase } = await requireRole("teacher")
  const payload = resourceSchema.parse(input)

  const { error } = await supabase.from("reservable_resources").insert({
    name: payload.name,
    code: payload.code,
    location: payload.location,
    category: payload.category,
    description: payload.description,
    requires_approval:
      payload.requires_approval === undefined
        ? true
        : payload.requires_approval,
  })

  if (error) {
    console.error("[resources:create]", error)
    throw new Error("No se pudo crear el recurso.")
  }

  revalidateResources()
}

export async function updateResourceAction(input: unknown) {
  const { supabase } = await requireRole("teacher")
  const payload = updateSchema.parse(input)

  const updates: Record<string, unknown> = {}
  if (payload.name !== undefined) updates.name = payload.name
  if (payload.code !== undefined) updates.code = payload.code
  if (payload.location !== undefined) updates.location = payload.location
  if (payload.category !== undefined) updates.category = payload.category
  if (payload.description !== undefined)
    updates.description = payload.description
  if (payload.requires_approval !== undefined)
    updates.requires_approval = payload.requires_approval

  const { error } = await supabase
    .from("reservable_resources")
    .update(updates)
    .eq("id", payload.id)

  if (error) {
    console.error("[resources:update]", error)
    throw new Error("No se pudo actualizar el recurso.")
  }

  revalidateResources()
}
