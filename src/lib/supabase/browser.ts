"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Did you forget to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY?"
    )
  }

  return createBrowserClient<Database>(url, anonKey)
}
