import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Debug endpoint to check environment variables
// WARNING: Remove this file after debugging!
export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    hasUrl: !!supabaseUrl,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
    hasServiceRoleKey: !!serviceRoleKey,
    serviceRoleKeyPrefix: serviceRoleKey ? serviceRoleKey.substring(0, 10) + '...' : 'NOT SET',
    hasAnonKey: !!anonKey,
    anonKeyPrefix: anonKey ? anonKey.substring(0, 10) + '...' : 'NOT SET',
    env: process.env.NODE_ENV,
    message: serviceRoleKey || anonKey 
      ? "✅ Supabase keys are set" 
      : "❌ Missing Supabase keys. Set SUPABASE_SERVICE_ROLE_KEY in Vercel",
  });
}
