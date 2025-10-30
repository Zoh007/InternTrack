import NextAuth from "next-auth";
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

const authOptions: any = {
  providers,
  session: { strategy: "jwt" as const },
  callbacks: {
    async jwt({ token, account }: any) {
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }: any) {
      // attach provider info for UI if needed
      session.provider = token.provider;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


