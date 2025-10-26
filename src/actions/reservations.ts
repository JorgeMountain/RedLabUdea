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

export async function reservationCreateAction(input: unknown) {
  const { supabase, user } = await requireRole("student")
  const payload = reservationSchema.parse(input)

  const startUtc = new Date(payload.startAt)
  const endUtc = new Date(payload.endAt)

  if (!isWithinLabHours(startUtc, endUtc, LAB_TIMEZONE)) {
    throw new Error("El horario debe estar dentro de las horas del laboratorio (07:00-20:00).")
  }

  if (!isValidDuration(startUtc, endUtc)) {
    throw new Error("Las reservas deben durar entre 30 minutos y 4 horas.")
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
    throw new Error("Recurso no encontrado.")
  }

  await ensureNoOverlap(supabase, payload.resourceId, startIso, endIso)

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
    throw new Error("No se pudo crear la reserva.")
  }

  if (status === "approved") {
    revalidateReservationViews()
    revalidatePath("/teacher/admin/resources")
  } else {
    revalidateReservationViews()
  }

  return reservation.id
}

export async function reservationApproveAction(reservationId: string) {
  const { supabase, user } = await requireRole("teacher")
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("resource_id, start_at, end_at, status")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:approve] reservation", error)
    throw new Error("Reserva no encontrada.")
  }

  if (reservation.status !== "pending") {
    throw new Error("Solo se pueden aprobar reservas pendientes.")
  }

  await ensureNoOverlap(
    supabase,
    reservation.resource_id,
    reservation.start_at,
    reservation.end_at,
    id
  )

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
    throw new Error("No se pudo aprobar la reserva.")
  }

  revalidateReservationViews()
}

export async function reservationRejectAction(reservationId: string) {
  const { supabase, user } = await requireRole("teacher")
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:reject] reservation", error)
    throw new Error("Reserva no encontrada.")
  }

  if (reservation.status !== "pending") {
    throw new Error("Solo se pueden rechazar reservas pendientes.")
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
    throw new Error("No se pudo rechazar la reserva.")
  }

  revalidateReservationViews()
}

export async function reservationCancelAction(reservationId: string) {
  const { supabase, user, profile } = await requireUser()
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("status, student_id")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:cancel] reservation", error)
    throw new Error("Reserva no encontrada.")
  }

  if (
    profile.role === "student" &&
    reservation.student_id !== user.id
  ) {
    throw new Error("No puedes cancelar reservas de otros usuarios.")
  }

  if (!["pending", "approved"].includes(reservation.status)) {
    throw new Error("Solo se pueden cancelar reservas pendientes o aprobadas.")
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
    throw new Error("No se pudo cancelar la reserva.")
  }

  revalidateReservationViews()
}

export async function reservationMarkDoneAction(reservationId: string) {
  const { supabase, user } = await requireRole("teacher")
  const id = z.string().uuid().parse(reservationId)

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("status")
    .eq("id", id)
    .single()

  if (error || !reservation) {
    console.error("[reservation:done] reservation", error)
    throw new Error("Reserva no encontrada.")
  }

  if (!["approved"].includes(reservation.status)) {
    throw new Error("Solo se pueden marcar como realizadas las reservas aprobadas.")
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
    throw new Error("No se pudo marcar como realizada.")
  }

  revalidateReservationViews()
}
