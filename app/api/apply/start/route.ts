import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { preferences, targetCount } = body;

    if (!preferences || !targetCount) {
      return NextResponse.json({ error: "Missing preferences or target count" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    // Get user ID from email
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save user preferences
    const { data: prefData, error: prefError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userData.id,
          job_types: preferences.jobTypes,
          locations: preferences.locations,
          remote_preference: preferences.remotePreference || null,
          salary_min: preferences.salaryMin ? parseInt(preferences.salaryMin) : null,
          salary_max: preferences.salaryMax ? parseInt(preferences.salaryMax) : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (prefError) {
      console.error("[apply] Failed to save preferences:", prefError);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    // Create auto-apply session
    const { data: sessionData, error: sessionError } = await supabase
      .from("auto_apply_sessions")
      .insert({
        user_id: userData.id,
        target_count: targetCount,
        current_count: 0,
        status: "pending",
        preferences_id: prefData.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[apply] Failed to create session:", sessionError);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    return NextResponse.json({ sessionId: sessionData.id });
  } catch (err) {
    console.error("[apply] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

