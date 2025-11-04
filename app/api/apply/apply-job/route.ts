import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";
import { extractResumeInfo, fillApplicationForm } from "../../../../lib/formFiller";
import * as fs from "fs";
import * as path from "path";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const sessionId = searchParams.get("sessionId");

    if (!jobId || !sessionId) {
      return NextResponse.json({ error: "Job ID and Session ID required" }, { status: 400 });
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

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("session_id", sessionId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Check if already applied
    const { data: existingApp } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userData.id)
      .eq("job_url", job.url)
      .eq("status", "applied")
      .single();

    if (existingApp) {
      return NextResponse.json({ error: "Already applied to this job" }, { status: 400 });
    }

    // Apply to the job (similar to applyToJob function)
    let application: any = null;
    let tempResumePath = "";

    try {
      // Create application record first (shows "applying" status)
      const { data: newApplication } = await supabase.from("applications").insert({
        user_id: userData.id,
        company_name: job.company,
        job_title: job.title,
        job_url: job.url,
        application_url: job.url,
        status: "applying",
        applied_at: new Date().toISOString(),
      }).select().single();
      application = newApplication;

      // Get resume data from storage
      let resumeData: any = null;
      
      try {
        const { data: files, error: listError } = await supabase.storage
          .from("resumes")
          .list("", {
            limit: 100,
            sortBy: { column: "created_at", order: "desc" },
          });

        if (!listError && files) {
          const userResumeJsonFiles = files.filter((f: any) => 
            f.name.startsWith(`resume_data_${userData.id}_`) && f.name.endsWith('.json')
          );
          
          const resumeJsonFile = userResumeJsonFiles[0];
          
          if (resumeJsonFile) {
            const { data: jsonData, error: downloadError } = await supabase.storage
              .from("resumes")
              .download(resumeJsonFile.name);

            if (!downloadError && jsonData) {
              const jsonText = await jsonData.text();
              resumeData = JSON.parse(jsonText);
            }
          }
        }
      } catch (error) {
        console.error("[apply-job] Error loading resume data:", error);
      }

      if (!resumeData || !resumeData.raw_text) {
        if (application) {
          await supabase
            .from("applications")
            .update({ status: "error" })
            .eq("id", application.id);
        }
        return NextResponse.json({ error: "No resume found. Please upload a resume first." }, { status: 400 });
      }
      
      // Extract structured info from resume using AI
      const jobDescription = job.description || `${job.title} at ${job.company}`;
      const resumeInfo = await extractResumeInfo(resumeData, jobDescription);

      // Get resume file URL from stored data
      const resumeFileUrl = resumeData.file_url;
      
      if (resumeFileUrl) {
        const tempDir = path.join(process.cwd(), ".temp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        tempResumePath = path.join(tempDir, `resume_${userData.id}_${Date.now()}.pdf`);
        
        try {
          const resumeResponse = await fetch(resumeFileUrl);
          if (resumeResponse.ok) {
            const arrayBuffer = await resumeResponse.arrayBuffer();
            const resumeBuffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(tempResumePath, resumeBuffer as any);
          } else {
            console.warn(`[apply-job] Could not download resume from ${resumeFileUrl}`);
            tempResumePath = "";
          }
        } catch (downloadError) {
          console.error("[apply-job] Error downloading resume:", downloadError);
          tempResumePath = "";
        }
      }
      
      // Screenshot callback to store screenshots
      const screenshotCallback = async (screenshot: string, step: string) => {
        if (!application?.id) return;
        
        try {
          const stepSafe = step.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
          const screenshotFileName = `screenshots/screenshot_${application.id}_${Date.now()}_${stepSafe}.png`;
          const base64Data = screenshot.split(',')[1];
          const screenshotBuffer = Buffer.from(base64Data, 'base64');
          
          const { error: uploadError } = await supabase.storage
            .from("resumes")
            .upload(screenshotFileName, screenshotBuffer as any, {
              contentType: "image/png",
              upsert: false,
            });
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(screenshotFileName);
            const screenshotUrl = urlData?.publicUrl;
            
            const { data: currentApp } = await supabase
              .from("applications")
              .select("notes")
              .eq("id", application.id)
              .single();
            
            let notesData: any = {};
            try {
              if (currentApp?.notes) {
                notesData = JSON.parse(currentApp.notes);
              }
            } catch (e) {
              // Notes might not be JSON
            }
            
            if (!notesData.screenshots) {
              notesData.screenshots = [];
            }
            notesData.screenshots.push({ step, url: screenshotUrl, timestamp: new Date().toISOString() });
            notesData.lastStep = step;
            
            await supabase
              .from("applications")
              .update({ notes: JSON.stringify(notesData) })
              .eq("id", application.id);
          }
        } catch (error) {
          console.error("[apply-job] Error storing screenshot:", error);
        }
      };
      
      const result = await fillApplicationForm(
        job.url,
        resumeInfo,
        tempResumePath,
        jobDescription,
        screenshotCallback,
        false // Run in headed mode (visible browser) for manual applications
      );

      // Update application status based on result
      if (application) {
        await supabase
          .from("applications")
          .update({ 
            status: result.success ? "applied" : "error",
            notes: result.error || undefined,
          })
          .eq("id", application.id);
      }

      // Update session count if successful
      if (result.success) {
        await supabase.rpc("increment_application_count", { session_id: sessionId });
      }

      // Cleanup temp file if it exists
      if (fs.existsSync(tempResumePath)) {
        fs.unlinkSync(tempResumePath);
      }

      return NextResponse.json({ 
        success: result.success,
        applicationId: application?.id || null,
        error: result.error 
      });
    } catch (error) {
      console.error(`[apply-job] Error:`, error);
      if (application) {
        await supabase.from("applications").update({ status: "error" }).eq("id", application.id);
      }
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[apply-job] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

