"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole, requireUser } from "@/lib/auth"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  isValidDuration,
  isWithinLabHours,
  LAB_TIMEZONE,
} from "@/lib/utils"

export type ReservationActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string }

const reservationSchema = z.object({
  resourceId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
})

function revalidateReservationViews() {
  revalidatePath("/reservations")
  revalidatePath("/teacher/admin/reservations")
}

async function ensureNoOverlap(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  resourceId: string,
  startIso: string,
  endIso: string,
  excludeId?: string
) {
  const range = `[${startIso},${endIso})`

  let query = supabase
    .from("reservations")
    .select("id")
    .eq("resource_id", resourceId)
    .in("status", ["pending", "approved"])
    .overlaps("during", range)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error("[reservation:overlap]", error)
    throw new Error("No se pudo verificar la disponibilidad.")
  }

  if (data && data.length > 0) {
    throw new Error("Ya hay una reserva en ese horario.")
  }
}

export async function reservationCreateAction(
  input: unknown
): Promise<ReservationActionResult<{ reservationId: string }>> {
  const { supabase, user } = await requireRole("student")
  const parsed = reservationSchema.safeParse(input)

  if (!parsed.success) {
    return { ok: false, message: "Datos invalidos para la reserva." }
  }

  const payload = parsed.data
  const startUtc = new Date(payload.startAt)
  const endUtc = new Date(payload.endAt)

  if (!isWithinLabHours(startUtc, endUtc, LAB_TIMEZONE)) {
    return {
      ok: false,
      message: "El horario debe estar dentro de las horas del laboratorio (07:00-20:00).",
    }
  }

  if (!isValidDuration(startUtc, endUtc)) {
    return {
      ok: false,
      message: "Las reservas deben durar entre 30 minutos y 4 horas.",
    }
  }

  const startIso = startUtc.toISOString()
  const endIso = endUtc.toISOString()

  const { data: resource, error: resourceError } = await supabase
    .from("reservable_resources")
    .select("requires_approval")
    .eq("id", payload.resourceId)
    .single()

  if (resourceError || !resource) {
    console.error("[reservation:create] resource", resourceError)
    return { ok: false, message: "Recurso no encontrado." }
  }

  try {
    await ensureNoOverlap(supabase, payload.resourceId, startIso, endIso)
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Ya hay una reserva en ese horario." ||
        error.message === "No se pudo verificar la disponibilidad."
      ) {
        return { ok: false, message: error.message }
      }
    }
    console.error("[reservation:create] availability", error)
    return {
      ok: false,
      message: "No se pudo verificar la disponibilidad.",
    }
  }

  const status = resource.requires_approval ? "pending" : "approved"

  const { data: reservation, error } = await supabase
    .from("reservations")
    .insert({
      resource_id: payload.resourceId,
      student_id: user.id,
      start_at: startIso,
      end_at: endIso,
      status,
    })
    .select("id")
    .single()

  if (error || !reservation) {
    console.error("[reservation:create] insert", error)
    return { ok: false, message: "No se pudo crear la reserva." }
  }

  revalidateReservationViews()
  if (status === "approved") {
    revalidatePath("/teacher/admin/resources")
  }

  return { ok: true, data: { reservationId: reservation.id } }
}

export async function reservationApproveAction(
  reservationId: string
): Promise<ReservationActionResult> {
  const { supabase, user } = await requireRole("teacher")
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("resource_id, start_at, end_at, status")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:approve] reservation", error)
    return { ok: false, message: "Reserva no encontrada." }
  }

  if (reservation.status !== "pending") {
    return { ok: false, message: "Solo se pueden aprobar reservas pendientes." }
  }

  try {
    await ensureNoOverlap(
      supabase,
      reservation.resource_id,
      reservation.start_at,
      reservation.end_at,
      id
    )
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Ya hay una reserva en ese horario." ||
        error.message === "No se pudo verificar la disponibilidad."
      ) {
        return { ok: false, message: error.message }
      }
    }
    console.error("[reservation:approve] availability", error)
    return { ok: false, message: "No se pudo verificar la disponibilidad." }
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update({
      status: "approved",
      teacher_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    console.error("[reservation:approve] update", updateError)
    return { ok: false, message: "No se pudo aprobar la reserva." }
  }

  revalidateReservationViews()
  return { ok: true }
}

export async function reservationRejectAction(
  reservationId: string
): Promise<ReservationActionResult> {
  const { supabase, user } = await requireRole("teacher")
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:reject] reservation", error)
    return { ok: false, message: "Reserva no encontrada." }
  }

  if (reservation.status !== "pending") {
    return { ok: false, message: "Solo se pueden rechazar reservas pendientes." }
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update({
      status: "rejected",
      teacher_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    console.error("[reservation:reject] update", updateError)
    return { ok: false, message: "No se pudo rechazar la reserva." }
  }

  revalidateReservationViews()
  return { ok: true }
}

export async function reservationCancelAction(
  reservationId: string
): Promise<ReservationActionResult> {
  const { supabase, user, profile } = await requireUser()
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("status, student_id")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:cancel] reservation", error)
    return { ok: false, message: "Reserva no encontrada." }
  }

  if (
    profile.role === "student" &&
    reservation.student_id !== user.id
  ) {
    return { ok: false, message: "No puedes cancelar reservas de otros usuarios." }
  }

  if (!["pending", "approved"].includes(reservation.status)) {
    return { ok: false, message: "Solo se pueden cancelar reservas pendientes o aprobadas." }
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update({
      status: "cancelled",
      decided_at: new Date().toISOString(),
      teacher_id: profile.role === "teacher" ? user.id : null,
    })
    .eq("id", id)

  if (updateError) {
    console.error("[reservation:cancel] update", updateError)
    return { ok: false, message: "No se pudo cancelar la reserva." }
  }

  revalidateReservationViews()
  return { ok: true }
}

export async function reservationMarkDoneAction(
  reservationId: string
): Promise<ReservationActionResult> {
  const { supabase, user } = await requireRole("teacher")
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:done] reservation", error)
    return { ok: false, message: "Reserva no encontrada." }
  }

  if (!["approved"].includes(reservation.status)) {
    return {
      ok: false,
      message: "Solo se pueden marcar como realizadas las reservas aprobadas.",
    }
  }

  const { error: updateError } = await supabase
    .from("reservations")
    .update({
      status: "done",
      teacher_id: user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (updateError) {
    console.error("[reservation:done] update", updateError)
    return { ok: false, message: "No se pudo marcar como realizada." }
  }

  revalidateReservationViews()
  return { ok: true }
}
