import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";

export async function GET(request: Request) {
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

    // Get user
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get session status
    const { data: sessionData } = await supabase
      .from("auto_apply_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userData.id)
      .single();

    if (!sessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get current job being processed (if any)
    // Look for the most recent application with status "applying"
    const { data: currentApplication } = await supabase
      .from("applications")
      .select("company_name, job_title")
      .eq("user_id", userData.id)
      .eq("status", "applying")
      .order("applied_at", { ascending: false })
      .limit(1)
      .single();
    
    const currentJob = currentApplication ? {
      company: currentApplication.company_name,
      title: currentApplication.job_title,
    } : null;

    // Get applications
    const { data: applications } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userData.id)
      .order("applied_at", { ascending: false })
      .limit(100);

    // Get jobs for this session
    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({
      session: {
        ...sessionData,
        current_job: currentJob || null,
      },
      applications: applications || [],
      jobs: jobs || [],
    });
  } catch (err) {
    console.error("[status] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

