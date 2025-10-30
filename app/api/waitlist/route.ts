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
    const { error: dbError } = await supabase
      .from("waitlist_signups")
      .upsert({ email }, { onConflict: "email" });

    if (dbError) {
      console.error("[waitlist] insert failed", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}


