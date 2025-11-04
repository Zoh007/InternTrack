import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Log at the start for debugging
  console.log("[waitlist] POST request received");
  console.log("[waitlist] Environment check:", {
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || "NOT SET"
  });
  
  try {
    const body = await request.json().catch(() => null);
    const email: string | undefined = body?.email?.toString().trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Get Supabase client - this will throw if env vars are missing
    let supabase;
    try {
      supabase = getSupabaseServerClient();
    } catch (configError: any) {
      console.error("[waitlist] Configuration error:", configError);
      return NextResponse.json({ 
        error: "Configuration error",
        details: configError.message || "Missing Supabase configuration. Check environment variables in Vercel.",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel project settings"
      }, { status: 500 });
    }
    // Attempt database operation with better error handling
    let dbResult;
    try {
      dbResult = await supabase
        .from("waitlist_signups")
        .upsert({ email, created_at: new Date().toISOString() }, { onConflict: "email" })
        .select();
    } catch (fetchError: any) {
      console.error("[waitlist] Database fetch error:", fetchError);
      // This catches network/fetch errors
      if (fetchError?.message?.includes("fetch failed") || fetchError?.code === "ENOTFOUND" || fetchError?.code === "ECONNREFUSED") {
        return NextResponse.json({ 
          error: "Database connection failed",
          details: "Cannot reach Supabase. Check your NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables.",
          message: fetchError.message,
          hint: "Go to Vercel Project Settings → Environment Variables and ensure NEXT_PUBLIC_SUPABASE_URL is set correctly"
        }, { status: 500 });
      }
      throw fetchError; // Re-throw if not a fetch error
    }

    const { data, error: dbError } = dbResult;

    if (dbError) {
      console.error("[waitlist] Database error:", dbError);
      // Return more specific error message for debugging
      return NextResponse.json({ 
        error: "Database error", 
        details: dbError.message || dbError.details || "Unknown database error",
        code: dbError.code || "unknown",
        hint: dbError.hint || "Check if the waitlist_signups table exists in Supabase"
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "You're on the waitlist!" });
  } catch (err: any) {
    console.error("[waitlist] Unexpected error:", err);
    console.error("[waitlist] Error type:", err?.constructor?.name);
    console.error("[waitlist] Error message:", err?.message);
    console.error("[waitlist] Error stack:", err?.stack);
    
    // Check for fetch errors (usually network/env var issues)
    const errorMessage = err?.message || String(err) || "";
    const isFetchError = errorMessage.includes("fetch failed") || 
                         errorMessage.includes("fetch") ||
                         err?.code === "ENOTFOUND" || 
                         err?.code === "ECONNREFUSED" ||
                         err?.name === "TypeError" && errorMessage.includes("fetch");
    
    if (isFetchError) {
      return NextResponse.json({ 
        error: "Database connection failed",
        details: "Cannot connect to Supabase database. This usually means environment variables are not set in Vercel.",
        message: errorMessage,
        hint: "Go to Vercel Project Settings → Environment Variables and add: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        debug: process.env.NODE_ENV === "development" ? {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        } : undefined
      }, { status: 500 });
    }
    
    // Check for missing environment variables
    if (errorMessage.includes("env var missing") || errorMessage.includes("Missing Supabase") || errorMessage.includes("Missing")) {
      return NextResponse.json({ 
        error: "Configuration error",
        details: errorMessage,
        hint: "Set environment variables in Vercel: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: "Unexpected error. Please try again.",
      details: errorMessage || "Unknown error occurred",
      type: err?.constructor?.name || typeof err
    }, { status: 500 });
  }
}


