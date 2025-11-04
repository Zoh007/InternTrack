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
        details: process.env.NODE_ENV === "development" ? dbError.message : undefined 
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "You're on the waitlist!" });
  } catch (err: any) {
    console.error("[waitlist] Unexpected error:", err);
    return NextResponse.json({ 
      error: "Unexpected error. Please try again.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined
    }, { status: 500 });
  }
}


