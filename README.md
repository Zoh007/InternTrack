# InternTrack (MVP Web)

Tech: Next.js 14 (App Router), TypeScript, Tailwind CSS

## Getting Started

1) Install deps

```
npm install
```

2) Run dev server

```
npm run dev
```

Visit http://localhost:3000

## Structure
- `app/` app router pages
  - `/` landing (Get started modal)
  - `/jobs` search (placeholder)
  - `/tracker` application tracker (placeholder)
  - `/prep` interview prep (placeholder)
  - `/profile` profile (placeholder)
- `styles/globals.css` Tailwind base

## Next Steps
- Hook up real data for jobs
- Auth + DB (Prisma + Postgres)
- Application tracker board UI
- Company hubs + question bank
- AI auto-apply agent service

## Sign-In (NextAuth)
Homepage has a "Get started free" button opening a modal with Google and Microsoft options.

### Google
- Google OAuth Web client
- Redirect URI: `http://localhost:3000/api/auth/callback/google`

### Microsoft (Azure AD)
- App registration in Azure AD (single tenant or multi-tenant)
- Redirect URI (web): `http://localhost:3000/api/auth/callback/azure-ad`
- Tenant ID required

Create `.env.local`:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-random-string
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AZURE_AD_CLIENT_ID=...
AZURE_AD_CLIENT_SECRET=...
AZURE_AD_TENANT_ID=...
```
Restart dev server after setting envs.
