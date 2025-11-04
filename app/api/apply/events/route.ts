import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";

// Server-Sent Events endpoint for real-time updates
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("Session ID required", { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Get user
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return new Response("User not found", { status: 404 });
    }

    // Verify session belongs to user
    const { data: sessionData } = await supabase
      .from("auto_apply_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .eq("user_id", userData.id)
      .single();

    if (!sessionData) {
      return new Response("Session not found", { status: 404 });
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let lastJobCount = 0;
        let lastApplicationCount = 0;
        let lastSessionStatus: any = null;

        const send = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Send initial data
        try {
          const [sessionResult, jobsResult, applicationsResult] = await Promise.all([
            supabase
              .from("auto_apply_sessions")
              .select("*")
              .eq("id", sessionId)
              .single(),
            supabase
              .from("jobs")
              .select("*")
              .eq("session_id", sessionId)
              .order("created_at", { ascending: false })
              .limit(100),
            supabase
              .from("applications")
              .select("*")
              .eq("user_id", userData.id)
              .order("applied_at", { ascending: false }),
          ]);

          if (sessionResult.data) {
            lastSessionStatus = sessionResult.data;
            send({ type: "session", data: sessionResult.data });
          }

          if (jobsResult.data) {
            lastJobCount = jobsResult.data.length;
            send({ type: "jobs", data: jobsResult.data });
          }

          if (applicationsResult.data) {
            lastApplicationCount = applicationsResult.data.length;
            send({ type: "applications", data: applicationsResult.data });
          }
        } catch (error) {
          console.error("[SSE] Error loading initial data:", error);
        }

        // Poll for changes every 500ms
        const interval = setInterval(async () => {
          try {
            // Check for new jobs
            const { data: jobs } = await supabase
              .from("jobs")
              .select("*")
              .eq("session_id", sessionId)
              .order("created_at", { ascending: false })
              .limit(100);

            if (jobs && jobs.length > lastJobCount) {
              const newJobs = jobs.slice(0, jobs.length - lastJobCount);
              send({ type: "job", data: newJobs });
              lastJobCount = jobs.length;
            } else if (jobs && jobs.length !== lastJobCount) {
              // Jobs count changed (reload all)
              send({ type: "jobs", data: jobs });
              lastJobCount = jobs.length;
            }

            // Check for session updates
            const { data: session } = await supabase
              .from("auto_apply_sessions")
              .select("*")
              .eq("id", sessionId)
              .single();

            if (session && JSON.stringify(session) !== JSON.stringify(lastSessionStatus)) {
              send({ type: "session", data: session });
              lastSessionStatus = session;
            }

            // Check for new/updated applications
            const { data: applications } = await supabase
              .from("applications")
              .select("*")
              .eq("user_id", userData.id)
              .order("applied_at", { ascending: false });

            if (applications && applications.length !== lastApplicationCount) {
              send({ type: "applications", data: applications });
              lastApplicationCount = applications.length;
            }
          } catch (error) {
            console.error("[SSE] Error polling:", error);
          }
        }, 500);

        // Cleanup on close
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[SSE] Error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

