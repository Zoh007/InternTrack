import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(request: Request) {
  // Debug endpoint to check environment variables and Supabase connection
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceKey = !!serviceRoleKey;
  const hasAnonKey = !!anonKey;
  
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
      details: error?.details || null,
      hint: error?.hint || null,
    };
  } catch (err: any) {
    supabaseError = {
      message: err.message,
      stack: err.stack,
      name: err.name,
      cause: err.cause?.message || null,
    };
    
    // Also try to test the URL directly
    try {
      const testUrl = `${url}/rest/v1/waitlist_signups?select=count&limit=1`;
      const testResponse = await fetch(testUrl, {
        headers: {
          'apikey': serviceRoleKey || anonKey || '',
          'Authorization': `Bearer ${serviceRoleKey || anonKey || ''}`,
        },
      });
      connectionTest = {
        success: false,
        error: `Direct fetch test: ${testResponse.status} ${testResponse.statusText}`,
        code: null,
        fetchStatus: testResponse.status,
      };
    } catch (fetchErr: any) {
      connectionTest = {
        success: false,
        error: err.message,
        code: null,
        fetchError: fetchErr.message,
      };
    }
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

