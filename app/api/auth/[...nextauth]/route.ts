import NextAuth from "next-auth";
import { authOptions } from "../../../../lib/authConfig";

const handler = NextAuth(authOptions);

// Standard NextAuth pattern for App Router
export { handler as GET, handler as POST };


