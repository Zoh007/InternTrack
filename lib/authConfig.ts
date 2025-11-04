import Google from "next-auth/providers/google";
import AzureAD from "next-auth/providers/azure-ad";

const providers: any[] = [];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}
if (
  process.env.AZURE_AD_CLIENT_ID &&
  process.env.AZURE_AD_CLIENT_SECRET &&
  process.env.AZURE_AD_TENANT_ID
) {
  providers.push(
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    })
  );
}

// Validate required NextAuth environment variables
const nextAuthUrl = process.env.NEXTAUTH_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

if (!nextAuthUrl) {
  console.warn("[auth] Warning: NEXTAUTH_URL is not set. NextAuth may not work correctly.");
}

if (!nextAuthSecret) {
  console.warn("[auth] Warning: NEXTAUTH_SECRET is not set. This is required for production.");
}

if (providers.length === 0) {
  console.warn("[auth] Warning: No authentication providers configured. Set GOOGLE_CLIENT_ID/SECRET or AZURE_AD_* env vars.");
}

export const authOptions: any = {
  providers,
  secret: nextAuthSecret,
  session: { strategy: "jwt" as const },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      // Save or update user in Supabase when they sign in
      if (user && account) {
        try {
          const { getSupabaseServerClient } = require("../lib/supabaseServer");
          const supabase = getSupabaseServerClient();
          
          // Generate a consistent user ID from email + provider
          const userId = user.email + "_" + account.provider;
          
          const userData = {
            id: userId,
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            provider_id: account.providerAccountId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Upsert user - create if doesn't exist, update if exists
          const { error } = await supabase
            .from("users")
            .upsert(userData, { onConflict: "id" });

          if (error) {
            console.error("[auth] Failed to save user to Supabase:", error);
            // Don't block sign-in if DB save fails
          }
        } catch (err: any) {
          console.error("[auth] Error saving user to Supabase:", err?.message || err);
          // Don't block sign-in if DB connection fails
          // This allows auth to work even if Supabase is misconfigured
        }
      }
      return true;
    },
    async jwt({ token, account, user }: any) {
      if (account) {
        token.provider = account.provider;
      }
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: any) {
      // attach provider info for UI if needed
      session.provider = token.provider;
      if (token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
};

