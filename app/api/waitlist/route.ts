import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export async function POST(request: Request) {
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

    const supabase = getSupabaseServerClient();
    const { data, error: dbError } = await supabase
      .from("waitlist_signups")
      .upsert({ email, created_at: new Date().toISOString() }, { onConflict: "email" })
      .select();

    if (dbError) {
      console.error("[waitlist] Database error:", dbError);
      // Return more specific error message for debugging
      return NextResponse.json({ 
        error: "Database error", 
        details: dbError.message || dbError.details || "Unknown database error",
        code: dbError.code || "unknown",
        hint: dbError.hint || undefined
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "You're on the waitlist!" });
  } catch (err: any) {
    console.error("[waitlist] Unexpected error:", err);
    
    // Check for fetch errors (usually network/env var issues)
    if (err?.message?.includes("fetch failed") || err?.code === "ENOTFOUND" || err?.code === "ECONNREFUSED") {
      return NextResponse.json({ 
        error: "Database connection failed",
        details: "Unable to connect to database. Please check environment variables.",
        message: err.message
      }, { status: 500 });
    }
    
    // Check for missing environment variables
    if (err?.message?.includes("env var missing") || err?.message?.includes("Missing Supabase")) {
      return NextResponse.json({ 
        error: "Configuration error",
        details: err.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: "Unexpected error. Please try again.",
      details: err.message || "Unknown error occurred"
    }, { status: 500 });
  }
}


