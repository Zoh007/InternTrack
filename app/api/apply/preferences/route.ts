import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      jobTypes,
      locations,
      remotePreference,
      salaryMin,
      salaryMax,
      internshipTypes,
      numberOfApplications,
    } = body;

    const supabase = getSupabaseServerClient();

    // Get user ID from email
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Save or update preferences
    const { data: prefData, error: prefError } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: userData.id,
          job_types: jobTypes,
          locations: locations,
          remote_preference: remotePreference,
          salary_min: salaryMin ? parseInt(salaryMin) : null,
          salary_max: salaryMax ? parseInt(salaryMax) : null,
          internship_type: internshipTypes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (prefError) {
      console.error("[preferences] Save error:", prefError);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    // Create auto-apply session
    const { data: sessionData, error: sessionError } = await supabase
      .from("auto_apply_sessions")
      .insert({
        user_id: userData.id,
        target_count: numberOfApplications,
        current_count: 0,
        status: "pending",
        preferences_id: prefData?.id,
      })
      .select()
      .single();

    if (sessionError) {
      console.error("[session] Create error:", sessionError);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sessionId: sessionData.id,
      preferencesId: prefData?.id,
    });
  } catch (error) {
    console.error("[preferences] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}





