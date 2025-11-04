import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";

// PDF parsing function using pdf2json (better Node.js compatibility)
async function parsePDF(buffer: Buffer): Promise<{ text: string }> {
  return new Promise((resolve, reject) => {
    try {
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser(null, 1);
      
      let textContent = '';
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        reject(new Error(`PDF parsing error: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          // Extract text from all pages
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any) => {
              if (page.Texts && Array.isArray(page.Texts)) {
                page.Texts.forEach((text: any) => {
                  if (text.R && Array.isArray(text.R)) {
                    text.R.forEach((run: any) => {
                      if (run.T) {
                        // Decode URI-encoded text
                        try {
                          textContent += decodeURIComponent(run.T) + ' ';
                        } catch (e) {
                          textContent += run.T + ' ';
                        }
                      }
                    });
                  }
                });
              }
            });
          }
          
          resolve({ text: textContent.trim() });
        } catch (error: any) {
          reject(new Error(`Error extracting text: ${error?.message || 'Unknown error'}`));
        }
      });
      
      pdfParser.parseBuffer(buffer);
    } catch (error: any) {
      reject(new Error(`PDF parsing failed: ${error?.message || 'Unknown error'}`));
    }
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;
    const additionalInfo = formData.get("additionalInfo") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Resume PDF file is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Ensure the "resumes" bucket exists (create if it doesn't)
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const resumesBucket = buckets?.find((b: any) => b.name === "resumes");
      
      if (!resumesBucket) {
        // Try to create the bucket (requires service role key)
        const { error: createError } = await supabase.storage.createBucket("resumes", {
          public: true, // Make bucket public so we can access files
          fileSizeLimit: 10485760, // 10MB limit
        });
        
        if (createError) {
          console.warn("[upload-resume] Could not create bucket (may need manual setup):", createError);
          // Continue anyway - might work if bucket was just created
        }
      }
    } catch (bucketError) {
      console.warn("[upload-resume] Error checking/creating bucket:", bucketError);
      // Continue anyway - might still work
    }

    // Get user ID
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("email", session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse resume PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let parsedResumeText = "";

    // Try to parse PDF
    try {
      const pdfData = await parsePDF(buffer);
      parsedResumeText = pdfData.text || "";
    } catch (error) {
      console.error("[upload-resume] PDF parsing error:", error);
      // If parsing fails, we'll store the PDF anyway and extract text later when needed
      // Or use OpenAI vision API as fallback
    }

    // Store PDF in Supabase Storage
    const fileName = `resume_${userData.id}_${Date.now()}.pdf`;
    let resumeUrl = null;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(fileName, buffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      // Get public URL (or signed URL if needed)
      if (uploadData && !uploadError) {
        const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(fileName);
        resumeUrl = urlData?.publicUrl || null;
      }

      // If PDF parsing failed, return error
      if (!parsedResumeText || parsedResumeText.trim().length === 0) {
        return NextResponse.json({ 
          error: "Could not extract text from PDF. Please ensure your PDF contains selectable text (not just scanned images). Try saving your resume as a new PDF with text selectable." 
        }, { status: 400 });
      }
    } catch (error) {
      console.error("[upload-resume] Error storing PDF:", error);
      return NextResponse.json({ error: "Failed to store resume file" }, { status: 500 });
    }

    // Store resume text as a JSON file in Supabase Storage alongside the PDF
    // This way we don't need to modify the database schema
    const resumeData = {
      raw_text: parsedResumeText,
      additional_info: additionalInfo || "",
      file_url: resumeUrl,
      file_name: fileName,
      uploaded_at: new Date().toISOString(),
    };

    // Store resume data as JSON file in storage (same naming pattern as PDF)
    const resumeJsonName = `resume_data_${userData.id}_${Date.now()}.json`;
    try {
      const resumeJsonBuffer = Buffer.from(JSON.stringify(resumeData));
      const { error: jsonUploadError } = await supabase.storage
        .from("resumes")
        .upload(resumeJsonName, resumeJsonBuffer, {
          contentType: "application/json",
          upsert: false,
        });

      if (jsonUploadError) {
        // If bucket doesn't exist error, try to create it and retry
        const errorMessage = (jsonUploadError as any).message || String(jsonUploadError);
        const statusCode = (jsonUploadError as any).statusCode || (jsonUploadError as any).status;
        if (statusCode === '404' || statusCode === 404 || errorMessage.includes('Bucket not found')) {
          console.warn("[upload-resume] Bucket not found, attempting to create it...");
          const { error: createError } = await supabase.storage.createBucket("resumes", {
            public: true,
            fileSizeLimit: 10485760,
          });
          
          if (!createError) {
            // Retry upload after creating bucket
            const { error: retryError } = await supabase.storage
              .from("resumes")
              .upload(resumeJsonName, resumeJsonBuffer, {
                contentType: "application/json",
                upsert: false,
              });
              
            if (retryError) {
              console.error("[upload-resume] Error storing resume JSON after bucket creation:", retryError);
            }
          } else {
            console.error("[upload-resume] Error creating bucket:", createError);
          }
        } else {
          console.error("[upload-resume] Error storing resume JSON:", jsonUploadError);
        }
        // Continue anyway - we have the PDF stored
      }

      // Also try to update user_preferences with a reference (if a text column exists)
      // We'll store a simple reference that can be used to retrieve the data
      await supabase
        .from("user_preferences")
        .upsert(
          {
            user_id: userData.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
    } catch (error) {
      console.error("[upload-resume] Error storing resume data:", error);
      // Don't fail the upload if metadata storage fails - PDF is already stored
    }

    return NextResponse.json({
      success: true,
      message: "Resume uploaded successfully",
    });
  } catch (error) {
    console.error("[upload-resume] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

