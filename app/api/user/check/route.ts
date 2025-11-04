import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const supabase = getSupabaseServerClient();

    // Check if user exists in Supabase
    const { data: userData, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (error || !userData) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    return NextResponse.json({ exists: true, userId: userData.id });
  } catch (err) {
    console.error("[user/check] Error:", err);
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}





