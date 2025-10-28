"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import type { LoanRequestRow } from "@/types/database"

const loanItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1),
})

const createLoanSchema = z.object({
  purpose: z
    .string()
    .trim()
    .min(3, "Describe el proposito del prestamo"),
  items: z.array(loanItemSchema).min(1, "Selecciona al menos un equipo"),
})

function revalidateLoanViews() {
  revalidatePath("/requests")
  revalidatePath("/teacher/admin/requests")
  revalidatePath("/catalog")
}

export async function createLoanRequestAction(input: unknown) {
  const { supabase, user } = await requireRole("student")
  const payload = createLoanSchema.parse(input)

  const { data: request, error: requestError } = await supabase
    .from("loan_requests")
    .insert({
      student_id: user.id,
      purpose: payload.purpose,
      status: "pending",
    })
    .select("id")
    .single()

  if (requestError) {
    console.error("[loan:create] insert", requestError)
    throw new Error("No se pudo crear la solicitud. Intenta nuevamente.")
  }

  const detailRows = payload.items.map((item) => ({
    request_id: request.id,
    item_id: item.itemId,
    quantity: item.quantity,
  }))

  const { error: detailError } = await supabase
    .from("loan_request_items")
    .insert(detailRows)

  if (detailError) {
    console.error("[loan:create] items", detailError)
    throw new Error(
      "La solicitud se creo, pero no se pudieron guardar los items."
    )
  }

  revalidateLoanViews()
  return request.id
}

const requestIdSchema = z.string().uuid()

export async function approveLoanRequestAction(requestId: string) {
  const { supabase, user } = await requireRole("teacher")
  const id = requestIdSchema.parse(requestId)

  const { data: request, error: requestError } = await supabase
    .from("loan_requests")
    .select("*")
    .eq("id", id)
    .single<LoanRequestRow>()

  if (requestError || !request) {
    console.error("[loan:approve] request", requestError)
    throw new Error("Solicitud no encontrada.")
  }

  if (request.status !== "pending") {
    throw new Error("Solo se pueden aprobar solicitudes pendientes.")
  }

  const { data: items, error: itemsError } = await supabase
    .from("loan_request_items")
    .select("id, item_id, quantity, lab_items ( stock, name )")
    .eq("request_id", id)

  if (itemsError || !items) {
    console.error("[loan:approve] items", itemsError)
    throw new Error("No se pudieron leer los items de la solicitud.")
  }

  for (const item of items) {
    const stock = item.lab_items?.stock ?? 0
    if (stock < item.quantity) {
      throw new Error(
        `Stock insuficiente para ${item.lab_items?.name ?? "el equipo"}.`
      )
    }
  }

  const inventoryUpdates = items.map(async (item) => {
    const currentStock = item.lab_items?.stock ?? 0
    const newStock = currentStock - item.quantity

    const { error: updateError } = await supabase
      .from("lab_items")
      .update({ stock: newStock })
      .eq("id", item.item_id)

    if (updateError) {
      throw updateError
    }

    const { error: moveError } = await supabase.from("stock_moves").insert({
      item_id: item.item_id,
      request_id: id,
      delta: -item.quantity,
      created_by: user.id,
    })

    if (moveError) {
      throw moveError
    }
  })

  try {
    await Promise.all(inventoryUpdates)
  } catch (error) {
    console.error("[loan:approve] stock", error)
    throw new Error("No se pudo actualizar el inventario.")
  }

  const { error: statusError } = await supabase
    .from("loan_requests")
    .update({
      status: "approved",
      teacher_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (statusError) {
    console.error("[loan:approve] status", statusError)
    throw new Error("No se pudo completar la aprobacion.")
  }

  revalidateLoanViews()
}

export async function rejectLoanRequestAction(requestId: string) {
  const { supabase, user } = await requireRole("teacher")
  const id = requestIdSchema.parse(requestId)

  const { data: request, error } = await supabase
    .from("loan_requests")
    .select("status")
    .eq("id", id)
    .single()

  if (error || !request) {
    console.error("[loan:reject] request", error)
    throw new Error("Solicitud no encontrada.")
  }

  if (request.status !== "pending") {
    throw new Error("Solo se pueden rechazar solicitudes pendientes.")
  }

  const { error: updateError } = await supabase
    .from("loan_requests")
    .update({
      status: "rejected",
      teacher_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    console.error("[loan:reject] update", updateError)
    throw new Error("No se pudo rechazar la solicitud.")
  }

  revalidateLoanViews()
}

export async function returnLoanRequestAction(requestId: string) {
  const { supabase, user } = await requireRole("teacher")
  const id = requestIdSchema.parse(requestId)

  const { data: request, error } = await supabase
    .from("loan_requests")
    .select("status")
    .eq("id", id)
    .single()

  if (error || !request) {
    console.error("[loan:return] request", error)
    throw new Error("Solicitud no encontrada.")
  }

  if (request.status !== "approved") {
    throw new Error("Solo se pueden marcar como devueltas las solicitudes aprobadas.")
  }

  const { data: items, error: itemsError } = await supabase
    .from("loan_request_items")
    .select("item_id, quantity, lab_items ( stock )")
    .eq("request_id", id)

  if (itemsError || !items) {
    console.error("[loan:return] items", itemsError)
    throw new Error("No se pudieron leer los items del prestamo.")
  }

  const inventoryUpdates = items.map(async (item) => {
    const currentStock = item.lab_items?.stock ?? 0
    const newStock = currentStock + item.quantity

    const { error: updateError } = await supabase
      .from("lab_items")
      .update({ stock: newStock })
      .eq("id", item.item_id)

    if (updateError) {
      throw updateError
    }

    const { error: moveError } = await supabase.from("stock_moves").insert({
      item_id: item.item_id,
      request_id: id,
      delta: item.quantity,
      created_by: user.id,
    })

    if (moveError) {
      throw moveError
    }
  })

  try {
    await Promise.all(inventoryUpdates)
  } catch (error) {
    console.error("[loan:return] stock", error)
    throw new Error("No se pudo actualizar el inventario.")
  }

  const { error: statusError } = await supabase
    .from("loan_requests")
    .update({
      status: "returned",
      teacher_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (statusError) {
    console.error("[loan:return] update", statusError)
    throw new Error("No se pudo marcar como devuelto.")
  }

  revalidateLoanViews()
}
