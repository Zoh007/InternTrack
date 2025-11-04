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

export const authOptions: any = {
  providers,
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
        } catch (err) {
          console.error("[auth] Error saving user:", err);
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

