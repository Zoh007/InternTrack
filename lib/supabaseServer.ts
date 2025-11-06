import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerClient() {
  // Trim whitespace and newlines from environment variables
  // Vercel sometimes adds trailing newlines when copying/pasting
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

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

  // Configure Supabase client for serverless environments
  // Vercel serverless functions need specific configuration for reliable connections
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      // Use fetch with proper error handling for serverless
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        // Add timeout for serverless environments (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        return fetch(input, {
          ...init,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        });
      },
    },
  });
}


