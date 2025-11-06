import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
  
  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase credentials" }, { status: 500 });
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    url: url.substring(0, 30) + "...",
    tests: [],
  };

  // Test 1: Basic DNS resolution
  try {
    const testUrl = new URL(url);
    results.tests.push({
      name: "DNS Resolution",
      success: true,
      hostname: testUrl.hostname,
    });
  } catch (e: any) {
    results.tests.push({
      name: "DNS Resolution",
      success: false,
      error: e.message,
    });
    return NextResponse.json(results, { status: 200 });
  }

  // Test 2: Direct fetch to Supabase REST API
  try {
    const testUrl = `${url}/rest/v1/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    results.tests.push({
      name: "Direct REST API Fetch",
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  } catch (e: any) {
    results.tests.push({
      name: "Direct REST API Fetch",
      success: false,
      error: e.message,
      errorType: e.name,
      errorCode: e.code,
      cause: e.cause?.message,
    });
  }

  // Test 3: Try with different fetch options
  try {
    const testUrl = `${url}/rest/v1/waitlist_signups?select=count&limit=1`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      results.tests.push({
        name: "Waitlist Table Query",
        success: true,
        data: data,
      });
    } else {
      results.tests.push({
        name: "Waitlist Table Query",
        success: false,
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (e: any) {
    results.tests.push({
      name: "Waitlist Table Query",
      success: false,
      error: e.message,
      errorType: e.name,
    });
  }

  return NextResponse.json(results, { status: 200 });
}

