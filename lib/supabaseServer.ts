import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // More detailed error messages
  if (!url) {
    const errorMsg = "Missing NEXT_PUBLIC_SUPABASE_URL. " +
      "Set it in Vercel: Project Settings → Environment Variables";
    console.error("[Supabase] " + errorMsg);
    throw new Error(errorMsg);
  }

  const key = serviceRoleKey || anonKey;
  if (!key) {
    const errorMsg = "Missing Supabase key. " +
      "Set SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "in Vercel: Project Settings → Environment Variables";
    console.error("[Supabase] " + errorMsg);
    throw new Error(errorMsg);
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    throw new Error(`Invalid Supabase URL format: ${url}. Should be like https://xxxxx.supabase.co`);
  }

  // Log in development (never in production)
  if (process.env.NODE_ENV === "development") {
    console.log("[Supabase] Connecting to:", url.substring(0, 30) + "...");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}


