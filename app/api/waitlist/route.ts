import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const email: string | undefined = body?.email?.toString().trim();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Get Supabase client - this might throw if env vars are missing
    let supabase;
    try {
      supabase = getSupabaseServerClient();
    } catch (configError: any) {
      console.error("[waitlist] Configuration error:", configError);
      return NextResponse.json({ 
        error: "Configuration error",
        details: configError.message || "Missing Supabase configuration. Please check environment variables.",
        message: "Unable to connect to database. Please verify NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel."
      }, { status: 500 });
    }

    // Attempt database operation
    // Try using Supabase client first, fallback to direct REST API if it fails
    let data, dbError;
    
    try {
      const result = await supabase
        .from("waitlist_signups")
        .upsert({ email, created_at: new Date().toISOString() }, { onConflict: "email" })
        .select();
      
      data = result.data;
      dbError = result.error;
    } catch (fetchError: any) {
      // If Supabase client fails, try direct REST API call
      console.error("[waitlist] Supabase client failed, trying direct REST API:", fetchError);
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase configuration missing");
      }
      
      try {
        const restUrl = `${supabaseUrl}/rest/v1/waitlist_signups`;
        const response = await fetch(restUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation,resolution=merge-duplicates',
          },
          body: JSON.stringify({ email, created_at: new Date().toISOString() }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`REST API error: ${response.status} ${errorText}`);
        }
        
        data = await response.json();
        dbError = null;
      } catch (restError: any) {
        dbError = {
          message: restError.message || 'Both Supabase client and REST API failed',
          details: fetchError.message,
        };
      }
    }

    if (dbError) {
      console.error("[waitlist] Database error:", dbError);
      // Check if table doesn't exist
      if (dbError.code === "42P01" || dbError.message?.includes("does not exist")) {
        return NextResponse.json({ 
          error: "Database table not found",
          details: "The 'waitlist_signups' table does not exist in your Supabase database.",
          hint: "Please create the table in your Supabase dashboard or run the migration."
        }, { status: 500 });
      }
      
      // Return more specific error message for debugging
      return NextResponse.json({ 
        error: "Database error", 
        details: dbError.message || dbError.details || "Unknown database error",
        code: dbError.code || "unknown",
        hint: dbError.hint || undefined
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: "You're on the waitlist!" });
  } catch (err: any) {
    console.error("[waitlist] Unexpected error:", err);
    console.error("[waitlist] Error stack:", err?.stack);
    
    // Check for fetch errors (usually network/env var issues)
    if (err?.message?.includes("fetch failed") || err?.code === "ENOTFOUND" || err?.code === "ECONNREFUSED") {
      return NextResponse.json({ 
        error: "Database connection failed",
        details: "Unable to connect to database. Please check environment variables.",
        message: err.message
      }, { status: 500 });
    }
    
    // Check for missing environment variables
    if (err?.message?.includes("env var missing") || err?.message?.includes("Missing Supabase")) {
      return NextResponse.json({ 
        error: "Configuration error",
        details: err.message
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: "Unexpected error. Please try again.",
      details: err.message || "Unknown error occurred",
      type: err?.name || typeof err
    }, { status: 500 });
  }
}


