import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";
import { searchAllSources } from "../../../../lib/jobSearch";
import { extractResumeInfo, fillApplicationForm } from "../../../../lib/formFiller";
import * as fs from "fs";
import * as path from "path";

// Fast parallel job search - processes multiple sources simultaneously
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

    // Get user and session
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", (session as any).user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: sessionData } = await supabase
      .from("auto_apply_sessions")
      .select("*, user_preferences(*)")
      .eq("id", sessionId)
      .eq("user_id", userData.id)
      .single();

    if (!sessionData || !sessionData.user_preferences) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const preferences = sessionData.user_preferences;
    const targetCount = sessionData.target_count;

    // Update status and start background processing immediately
    await supabase
      .from("auto_apply_sessions")
      .update({ status: "searching", updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    // Return immediately - process in background
    // Don't await the search, let it run async
    processJobSearch(sessionId, userData.id, preferences, targetCount).catch(console.error);

    return NextResponse.json({ success: true, message: "Job search started" });
  } catch (error) {
    console.error("[search-jobs] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processJobSearch(
  sessionId: string,
  userId: string,
  preferences: any,
  targetCount: number
) {
  const supabase = getSupabaseServerClient();

  try {
    // Build search query from preferences
    // Search for more jobs than target to account for failures, but we'll apply to exactly targetCount
    // Buffer: 2x targetCount to ensure we have enough jobs even if many fail
    const searchLimit = Math.max(targetCount * 2, 20); // Minimum 20 jobs to ensure we have enough
    
    const searchQuery = {
      keywords: preferences.job_types || ["Software Engineer", "Developer", "Intern"],
      locations: preferences.locations || ["United States"],
      remote: preferences.remote_preference === "remote" ? "remote" : preferences.remote_preference === "hybrid" ? "hybrid" : "no",
      internshipTypes: ["summer", "fall", "spring"], // Default internship types
      limit: searchLimit, // Search for buffer amount, but will apply to exactly targetCount
    };
    
    console.log(`[processJobSearch] Target: EXACTLY ${targetCount} job applications, Searching for ${searchQuery.limit} jobs (buffer for failures)`);

    console.log(`[processJobSearch] Searching for jobs with query:`, searchQuery);

    // Search all sources in parallel
    const jobs = await searchAllSources(searchQuery);

    console.log(`[processJobSearch] Found ${jobs.length} total jobs`);

    // Store jobs in database - store all found jobs (up to search limit) as buffer
    // But we'll only apply to exactly targetCount successful applications
    const jobsToStore = jobs.slice(0, searchQuery.limit);
    console.log(`[processJobSearch] Storing ${jobsToStore.length} jobs (will apply to EXACTLY ${targetCount} jobs)`);
    
    const jobsToInsert = jobsToStore.map((job) => ({
      session_id: sessionId,
      title: job.title,
      company: job.company,
      location: job.location || "Remote",
      url: job.url,
      source: job.source,
      description: job.description || "",
      salary_min: job.salary?.min || null,
      salary_max: job.salary?.max || null,
      remote: job.remote || false,
      internship_type: job.internshipType || null,
    }));

    if (jobsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("jobs").insert(jobsToInsert);

      if (insertError) {
        console.error("[processJobSearch] Error inserting jobs:", insertError);
      } else {
        console.log(`[processJobSearch] Inserted ${jobsToInsert.length} jobs into database (target: ${targetCount})`);
      }
    }

    // Update session status to running and start auto-applying
    await supabase
      .from("auto_apply_sessions")
      .update({ 
        status: "running", 
        updated_at: new Date().toISOString() 
      })
      .eq("id", sessionId);

    // Start auto-applying to jobs (runs in headless mode automatically)
    await startAutoApply(sessionId, userId, targetCount);
  } catch (error) {
    console.error("[processJobSearch] Error:", error);
    await supabase
      .from("auto_apply_sessions")
      .update({ 
        status: "error",
        updated_at: new Date().toISOString() 
      })
      .eq("id", sessionId);
  }
}

async function startAutoApply(sessionId: string, userId: string, targetCount: number) {
  const supabase = getSupabaseServerClient();
  
  await supabase
    .from("auto_apply_sessions")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  let successfulApplications = 0;
  let processedJobIds = new Set<string>();
  let offset = 0;
  const batchSize = 50;

  console.log(`[startAutoApply] Starting auto-apply. Target: EXACTLY ${targetCount} successful applications.`);

  // Continue processing until we reach EXACTLY targetCount successful applications
  while (successfulApplications < targetCount) {
    // Get more jobs (with offset to get next batch)
    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (!jobs || jobs.length === 0) {
      console.log(`[startAutoApply] No more jobs available. Got ${successfulApplications}/${targetCount} successful applications.`);
      break;
    }

    // Filter out already processed jobs
    const newJobs = jobs.filter(job => !processedJobIds.has(job.id));

    if (newJobs.length === 0) {
      console.log(`[startAutoApply] All available jobs processed. Got ${successfulApplications}/${targetCount} successful applications.`);
      break;
    }

    // Process applications sequentially so we can show "Currently applying to..." in real-time
    for (const job of newJobs) {
      // Stop immediately when we reach EXACTLY targetCount successful applications
      if (successfulApplications >= targetCount) {
        console.log(`[startAutoApply] Reached EXACT target of ${targetCount} successful applications. Stopping.`);
        break;
      }

      processedJobIds.add(job.id);
      const result = await applyToJob(job, userId, sessionId);
      
      // Count successful applications
      if (result?.success) {
        successfulApplications++;
        console.log(`[startAutoApply] Successful application ${successfulApplications}/${targetCount}`);
        
        // Stop immediately if we've reached the exact target
        if (successfulApplications >= targetCount) {
          console.log(`[startAutoApply] Reached EXACT target of ${targetCount} successful applications. Stopping immediately.`);
          break;
        }
      }
      
      // Delay between applications to avoid rate limiting (longer delay for auto-apply)
      // Add random variation to avoid detection
      const delay = 2000 + Math.floor(Math.random() * 1000); // 2-3 seconds between applications
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Double-check: If we've reached target, break out of while loop
    if (successfulApplications >= targetCount) {
      break;
    }

    offset += batchSize;

    // If we've processed all jobs in this batch and haven't reached target, try next batch
    if (successfulApplications < targetCount && jobs.length < batchSize) {
      // No more jobs available
      break;
    }
  }

  // Get actual count from database
  const { data: sessionData } = await supabase
    .from("auto_apply_sessions")
    .select("current_count")
    .eq("id", sessionId)
    .single();

  const actualCount = sessionData?.current_count || successfulApplications;

  // Ensure we don't exceed targetCount
  const finalCount = Math.min(actualCount, targetCount);

  // Mark as completed
  await supabase
    .from("auto_apply_sessions")
    .update({ 
      status: "completed", 
      completed_at: new Date().toISOString(),
      current_count: finalCount,
      updated_at: new Date().toISOString()
    })
    .eq("id", sessionId);

  console.log(`[startAutoApply] Completed. Target: EXACTLY ${targetCount}, Actual successful applications: ${finalCount}`);
}

// Fast job application function with actual form filling
async function applyToJob(job: any, userId: string, sessionId: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseServerClient();
  
  let application: any = null; // Declare application outside try block
  let tempResumePath = "";

  try {
    // Create application record first (shows "applying" status)
    const { data: newApplication } = await supabase.from("applications").insert({
      user_id: userId,
      company_name: job.company,
      job_title: job.title,
      job_url: job.url,
      application_url: job.url,
      status: "applying",
      applied_at: new Date().toISOString(),
    }).select().single();
    application = newApplication; // Assign to outer scope variable

    // Get resume data from storage (stored as JSON file)
    // Look for the most recent resume JSON file for this user
    let resumeData: any = null;
    
    try {
      const { data: files, error: listError } = await supabase.storage
        .from("resumes")
        .list("", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (!listError && files) {
        // Find the most recent resume JSON file for this user
        const userResumeJsonFiles = files.filter((f: any) => 
          f.name.startsWith(`resume_data_${userId}_`) && f.name.endsWith('.json')
        );
        
        // Get the most recent one (they're sorted by created_at desc)
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
      console.error("[applyToJob] Error loading resume data:", error);
    }

    if (!resumeData || !resumeData.raw_text) {
      console.warn(`[applyToJob] No resume data found for user ${userId}`);
      // Update status to error
      if (application) {
        await supabase
          .from("applications")
          .update({ status: "error" })
          .eq("id", application.id);
      }
      return { success: false };
    }
    
    // Extract structured info from resume using AI
    const jobDescription = job.description || `${job.title} at ${job.company}`;
    const resumeInfo = await extractResumeInfo(resumeData, jobDescription);

    // Get resume file URL from stored data
    const resumeFileUrl = resumeData.file_url;
    
    // Download resume from storage to temp file
    if (resumeFileUrl) {
      const tempDir = path.join(process.cwd(), ".temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      tempResumePath = path.join(tempDir, `resume_${userId}_${Date.now()}.pdf`);
      try {
        const resumeResponse = await fetch(resumeFileUrl);
        if (resumeResponse.ok) {
          const arrayBuffer = await resumeResponse.arrayBuffer();
          const resumeBuffer = Buffer.from(arrayBuffer);
          fs.writeFileSync(tempResumePath, resumeBuffer as any); // Cast to any for fs.writeFileSync
        } else {
          console.warn(`[applyToJob] Could not download resume from ${resumeFileUrl}`);
          tempResumePath = ""; // Will skip file upload if unavailable
        }
      } catch (downloadError) {
        console.error("[applyToJob] Error downloading resume:", downloadError);
        tempResumePath = ""; // Will skip file upload if unavailable
      }
    }
    
    // Attempt to fill out the application form
    console.log(`[applyToJob] Attempting to fill application for ${job.company} - ${job.title}`);
    
    // Store screenshots and send them via SSE or store in Supabase Storage
    const screenshotCallback = async (screenshot: string, step: string) => {
      if (!application?.id) return; // Ensure application ID is available
      
      // Store screenshot in Supabase Storage for this application
      try {
        const stepSafe = step.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50); // Sanitize step name
        const screenshotFileName = `screenshots/screenshot_${application.id}_${Date.now()}_${stepSafe}.png`;
        const base64Data = screenshot.split(',')[1];
        const screenshotBuffer = Buffer.from(base64Data, 'base64');
        
        const { error: uploadError } = await supabase.storage
          .from("resumes") // Reuse resumes bucket
          .upload(screenshotFileName, screenshotBuffer as any, { // Cast to any for upload
            contentType: "image/png",
            upsert: false,
          });
        
        if (!uploadError) {
          // Update application notes with screenshot reference
          const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(screenshotFileName);
          const screenshotUrl = urlData?.publicUrl;
          
          // Get current application notes to append
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
            // Notes might not be JSON, start fresh
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
        console.error("[applyToJob] Error storing screenshot:", error);
        // Continue even if screenshot storage fails
      }
    };
    
    // Auto-apply runs in headless mode (no visible browser)
    const result = await fillApplicationForm(
      job.url,
      resumeInfo,
      tempResumePath,
      jobDescription,
      screenshotCallback,
      true // headless: true for automatic applications
    );

    // Update application status based on result
    if (application) {
      await supabase
        .from("applications")
        .update({ 
          status: result.success ? "applied" : "error",
          notes: result.error || undefined, // Store error message if any
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

    return { success: result.success }; // Return success status
  } catch (error) {
    console.error(`[applyToJob] Error for ${job.company}:`, error);
    // Update application to error status if it exists
    try {
      const { data: apps } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", userId)
        .eq("job_url", job.url)
        .eq("status", "applying")
        .order("applied_at", { ascending: false })
        .limit(1)
        .single();
      
      if (apps) {
        await supabase.from("applications").update({ status: "error" }).eq("id", apps.id);
      }
    } catch (updateError) {
      console.error("[applyToJob] Failed to update error status:", updateError);
    }
    
    return { success: false }; // Indicate failure
  }
}
