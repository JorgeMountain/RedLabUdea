import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Did you forget to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY?"
    )
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      async get(name: string) {
        const store = await cookies()
        return store.get(name)?.value
      },
      async set(
        name: string,
        value: string,
        options?: Record<string, unknown>
      ) {
        try {
          const store = await cookies()
          store.set({ name, value, ...(options ?? {}) })
        } catch {
          // noop - setting cookies in a RSC can throw during build/edge
        }
      },
      async remove(name: string, options?: Record<string, unknown>) {
        try {
          const store = await cookies()
          store.set({ name, value: "", ...(options ?? {}) })
        } catch {
          // noop
        }
      },
    },
  })
}
