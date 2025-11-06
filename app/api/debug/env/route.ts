import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Debug endpoint to check environment variables in production
  // Values are masked for security
  const envVars = {
    // Supabase variables
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(process.env.NEXT_PUBLIC_SUPABASE_URL.length - 10)}`
        : 'MISSING',
      length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      value: process.env.SUPABASE_SERVICE_ROLE_KEY 
        ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(process.env.SUPABASE_SERVICE_ROLE_KEY.length - 10)}`
        : 'MISSING',
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      startsWith: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || 'N/A',
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length - 10)}`
        : 'MISSING',
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      startsWith: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) || 'N/A',
    },
    // NextAuth variables
    NEXTAUTH_URL: {
      exists: !!process.env.NEXTAUTH_URL,
      value: process.env.NEXTAUTH_URL || 'MISSING',
    },
    NEXTAUTH_SECRET: {
      exists: !!process.env.NEXTAUTH_SECRET,
      value: process.env.NEXTAUTH_SECRET ? 'SET (hidden)' : 'MISSING',
      length: process.env.NEXTAUTH_SECRET?.length || 0,
    },
    // Environment
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  };

  // Test if we can parse the Supabase URL
  let urlValidation = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      urlValidation = {
        valid: true,
        protocol: url.protocol,
        host: url.host,
        hostname: url.hostname,
      };
    } catch (e: any) {
      urlValidation = {
        valid: false,
        error: e.message,
      };
    }
  }

  return NextResponse.json({
    environmentVariables: envVars,
    urlValidation,
    timestamp: new Date().toISOString(),
  }, { status: 200 });
}

