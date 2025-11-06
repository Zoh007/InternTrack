import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { authOptions } from "../../../../lib/authConfig";

// PDF parsing function using pdf2json (better Node.js compatibility)
async function parsePDF(buffer: Buffer): Promise<{ text: string }> {
  return new Promise((resolve, reject) => {
    try {
      console.log("[parsePDF] Starting PDF parsing...");
      console.log("[parsePDF] Buffer size:", buffer.length, "bytes");
      
      const PDFParser = require('pdf2json');
      const pdfParser = new PDFParser(null, 1);
      
      let textContent = '';
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error("[parsePDF] PDF parsing error:", errData);
        reject(new Error(`PDF parsing error: ${errData.parserError}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          console.log("[parsePDF] PDF data ready!");
          console.log("[parsePDF] PDF has pages:", pdfData.Pages ? pdfData.Pages.length : 0);
          
          // Extract text from all pages - parse everything thoroughly
          if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
            pdfData.Pages.forEach((page: any, pageIndex: number) => {
              console.log(`[parsePDF] Processing page ${pageIndex + 1}...`);
              const pageTexts = page.Texts ? page.Texts.length : 0;
              console.log(`[parsePDF] Page ${pageIndex + 1} has ${pageTexts} text elements`);
              
              let pageText = '';
              
              if (page.Texts && Array.isArray(page.Texts)) {
                // Sort texts by Y position (top to bottom) and X position (left to right) for proper reading order
                const sortedTexts = [...page.Texts].sort((a: any, b: any) => {
                  const yA = a.y || 0;
                  const yB = b.y || 0;
                  // Sort top-to-bottom first, then left-to-right
                  if (Math.abs(yA - yB) > 5) { // Different line (5pt threshold)
                    return yA - yB; // Smaller Y appears first (top of page)
                  }
                  return (a.x || 0) - (b.x || 0); // Same line, sort by X
                });
                
                sortedTexts.forEach((text: any, textIndex: number) => {
                  if (text.R && Array.isArray(text.R)) {
                    text.R.forEach((run: any) => {
                      if (run.T) {
                        // Decode URI-encoded text
                        try {
                          const decodedText = decodeURIComponent(run.T);
                          pageText += decodedText;
                          if (textIndex < 5) { // Log first few text elements for debugging
                            console.log(`[parsePDF] Page ${pageIndex + 1}, Text ${textIndex}: "${decodedText.substring(0, 50)}"`);
                          }
                        } catch (e) {
                          pageText += run.T;
                          if (textIndex < 5) {
                            console.log(`[parsePDF] Page ${pageIndex + 1}, Text ${textIndex} (raw): "${run.T.substring(0, 50)}"`);
                          }
                        }
                      }
                    });
                  } else {
                    // Some PDFs might have text directly without R array
                    if (text.T) {
                      try {
                        const decodedText = decodeURIComponent(text.T);
                        pageText += decodedText;
                        console.log(`[parsePDF] Page ${pageIndex + 1}, Direct text: "${decodedText.substring(0, 50)}"`);
                      } catch (e) {
                        pageText += text.T;
                      }
                    }
                  }
                  
                  // Add space between text elements (but not if it's already whitespace)
                  if (!pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                    pageText += ' ';
                  }
                });
              } else {
                console.warn(`[parsePDF] Page ${pageIndex + 1} has no Texts array`);
              }
              
              // Add page text to total content with page separator
              if (pageText.trim().length > 0) {
                textContent += pageText.trim() + '\n\n';
                console.log(`[parsePDF] Page ${pageIndex + 1} extracted ${pageText.trim().length} characters`);
              } else {
                console.warn(`[parsePDF] Page ${pageIndex + 1} extracted no text!`);
              }
            });
          } else {
            console.warn("[parsePDF] PDF has no Pages array or Pages is not an array");
            console.log("[parsePDF] PDF data structure:", Object.keys(pdfData));
            
            // Try alternative extraction methods
            if (pdfData.formImage) {
              console.log("[parsePDF] PDF has formImage, trying alternative extraction...");
            }
          }
          
          const finalText = textContent.trim();
          console.log("[parsePDF] Total extracted text length:", finalText.length, "characters");
          console.log("[parsePDF] Number of pages processed:", pdfData.Pages ? pdfData.Pages.length : 0);
          console.log("[parsePDF] First 500 characters:", finalText.substring(0, 500));
          console.log("[parsePDF] Last 200 characters:", finalText.substring(Math.max(0, finalText.length - 200)));
          
          if (finalText.length === 0) {
            console.warn("[parsePDF] WARNING: No text extracted from PDF!");
            console.log("[parsePDF] Full PDF structure:", JSON.stringify(pdfData, null, 2).substring(0, 1000));
          }
          
          resolve({ text: finalText });
        } catch (error: any) {
          console.error("[parsePDF] Error extracting text:", error);
          console.error("[parsePDF] Error stack:", error?.stack);
          reject(new Error(`Error extracting text: ${error?.message || 'Unknown error'}`));
        }
      });
      
      console.log("[parsePDF] Parsing buffer...");
      pdfParser.parseBuffer(buffer);
    } catch (error: any) {
      console.error("[parsePDF] PDF parsing failed:", error);
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
    const preParsedText = formData.get("parsedText") as string | null; // Client-side parsed text

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

    // Use client-side parsed text if available, otherwise parse server-side
    console.log("[upload-resume] Starting resume upload for user:", session.user.email);
    console.log("[upload-resume] File name:", file.name);
    console.log("[upload-resume] File size:", file.size, "bytes");
    console.log("[upload-resume] File type:", file.type);
    
    let parsedResumeText = "";

    if (preParsedText && preParsedText.trim().length > 0) {
      // Use client-side parsed text (free, already extracted in browser)
      console.log("[upload-resume] Using client-side parsed text");
      parsedResumeText = preParsedText.trim();
      console.log("[upload-resume] Client-side parsed text length:", parsedResumeText.length, "characters");
      console.log("[upload-resume] Preview (first 300 chars):", parsedResumeText.substring(0, 300));
      
      // Print the entire resume
      try {
        console.log("[upload-resume] ===== BEGIN FULL RESUME TEXT DUMP (from client) =====");
        console.log(`[upload-resume] Total length: ${parsedResumeText.length} characters`);
        const lines = parsedResumeText.split(/\r?\n/);
        lines.forEach((line, idx) => {
          console.log(`[upload-resume] LINE ${idx + 1}: ${line}`);
        });
        console.log("[upload-resume] ===== END FULL RESUME TEXT DUMP =====");
      } catch (dumpErr) {
        console.warn("[upload-resume] Failed to dump full resume text:", dumpErr);
      }
    } else {
      // Fallback: Parse server-side (if client-side parsing failed or wasn't available)
      console.log("[upload-resume] Client-side parsing not available, falling back to server-side parsing...");
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      try {
        const pdfData = await parsePDF(buffer);
        parsedResumeText = pdfData.text || "";
        console.log("[upload-resume] Server-side PDF parsing successful!");
        console.log("[upload-resume] Extracted text length:", parsedResumeText.length, "characters");
        console.log("[upload-resume] Preview (first 300 chars):", parsedResumeText.substring(0, 300));
      } catch (error: any) {
        console.error("[upload-resume] Server-side PDF parsing error:", error);
        console.error("[upload-resume] Error details:", error?.message || error);
        console.error("[upload-resume] Error stack:", error?.stack);
        // Continue - we'll validate text length later
      }
    }

    // Store PDF in Supabase Storage
    const fileName = `resume_${userData.id}_${Date.now()}.pdf`;
    let resumeUrl = null;
    
    // Get buffer for file upload (needed for storage)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
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
      debug: {
        parsedTextLength: parsedResumeText.length,
        parsedTextPreview: parsedResumeText.substring(0, 500), // First 500 chars for debugging
        fileName: fileName,
        resumeUrl: resumeUrl,
      },
    });
  } catch (error) {
    console.error("[upload-resume] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

