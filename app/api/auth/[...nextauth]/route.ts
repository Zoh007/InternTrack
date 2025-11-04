import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/authConfig";

const handler = NextAuth(authOptions);

export async function GET(req: Request, context: { params: any }) {
  try {
    return await handler(req, context);
  } catch (error: any) {
    console.error("[auth] NextAuth GET error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Authentication error",
        message: error?.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

export async function POST(req: Request, context: { params: any }) {
  try {
    return await handler(req, context);
  } catch (error: any) {
    console.error("[auth] NextAuth POST error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Authentication error",
        message: error?.message || "Unknown error",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}


