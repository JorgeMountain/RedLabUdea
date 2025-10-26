import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { ProfileRow } from "@/types/database"

export type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>

export type UserProfile = {
  supabase: SupabaseServerClient
  user: { id: string; email?: string | null }
  profile: ProfileRow
}

export async function getUserProfile() {
  const supabase = createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("[auth:getUser]", userError)
    return null
  }

  if (!user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (profileError) {
    console.error("[auth:getProfile]", profileError)
    return null
  }

  if (!profile) {
    const metadataDisplayName =
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : null
    const fallbackName = metadataDisplayName ?? user.email ?? ""

    return {
      supabase,
      user,
      profile: {
        user_id: user.id,
        display_name: fallbackName,
        role: "student",
        created_at: null,
      },
    }
  }

  const metadataDisplayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null

  const trimmedMetadata =
    metadataDisplayName && metadataDisplayName.trim().length > 0
      ? metadataDisplayName.trim()
      : null
  const trimmedProfileName =
    profile.display_name && profile.display_name.trim().length > 0
      ? profile.display_name.trim()
      : ""
  let displayName = trimmedProfileName
  const shouldAdoptMetadataName =
    trimmedMetadata &&
    (displayName.length === 0 ||
      (user.email && displayName.toLowerCase() === user.email.toLowerCase()))

  if (shouldAdoptMetadataName) {
    displayName = trimmedMetadata
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: trimmedMetadata })
      .eq("user_id", user.id)
    if (updateError) {
      console.error("[auth:updateProfileName]", updateError)
    }
  } else if (displayName.length === 0 && user.email) {
    displayName = user.email
  }

  const sanitizedProfile: ProfileRow = {
    ...profile,
    display_name: displayName,
  }

  return { supabase, user, profile: sanitizedProfile }
}

export async function requireUser(options?: { redirectTo?: string }) {
  const result = await getUserProfile()
  if (!result) {
    redirect(options?.redirectTo ?? "/signin")
  }
  return result!
}

export async function requireRole(
  role: "student" | "teacher",
  options?: { redirectTo?: string }
) {
  const result = await requireUser(options)

  if (result.profile.role !== role) {
    redirect(
      role === "teacher" ? "/teacher/admin/requests" : "/catalog"
    )
  }

  return result
}
