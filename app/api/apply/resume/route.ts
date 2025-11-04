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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("auto_apply_sessions")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("user_id", userData.id);

    if (error) {
      return NextResponse.json({ error: "Failed to resume" }, { status: 500 });
    }

    // Resume the auto-apply process
    const { data: sessionData } = await supabase
      .from("auto_apply_sessions")
      .select("*, user_preferences(*)")
      .eq("id", sessionId)
      .single();

    if (sessionData && sessionData.status === "running") {
      // Re-start the application process
      const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .eq("session_id", sessionId)
        .limit(sessionData.target_count - sessionData.current_count);

      if (jobs && jobs.length > 0) {
        // Continue applying in background
        startAutoApply(sessionId, userData.id, sessionData.target_count).catch(console.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[resume] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function startAutoApply(sessionId: string, userId: string, targetCount: number) {
  const supabase = getSupabaseServerClient();
  
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("session_id", sessionId)
    .limit(targetCount);

  if (!jobs || jobs.length === 0) return;

  const applicationPromises = jobs.map((job, index) => 
    applyToJob(job, userId, sessionId, index)
  );

  Promise.allSettled(applicationPromises);
}

async function applyToJob(job: any, userId: string, sessionId: string, index: number) {
  const supabase = getSupabaseServerClient();
  
  try {
    await supabase.from("applications").insert({
      user_id: userId,
      company_name: job.company,
      job_title: job.title,
      job_url: job.url,
      application_url: job.url,
      status: "applied",
      applied_at: new Date().toISOString(),
    });

    await supabase.rpc("increment_application_count", { session_id: sessionId });
  } catch (error) {
    console.error(`[applyToJob] Error:`, error);
  }
}





