import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(request: Request) {
  // Debug endpoint to check environment variables and Supabase connection
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  let supabaseError = null;
  let connectionTest = null;
  
  try {
    const supabase = getSupabaseServerClient();
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from("waitlist_signups")
      .select("count")
      .limit(1);
    
    connectionTest = {
      success: !error,
      error: error?.message || null,
      code: error?.code || null,
    };
  } catch (err: any) {
    supabaseError = {
      message: err.message,
      stack: err.stack,
    };
  }
  
  return NextResponse.json({
    environment: {
      hasSupabaseUrl: !!url,
      supabaseUrl: url ? url.substring(0, 30) + "..." : "MISSING",
      hasServiceKey,
      hasAnonKey,
      nodeEnv: process.env.NODE_ENV,
    },
    supabaseError,
    connectionTest,
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}

