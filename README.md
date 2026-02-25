# MiroLeak

## Background

MiroLeak (Miro Security Posture Analyzer) is a lightweight security visibility tool for Miro boards.

It was built to answer a simple question: **“Are our collaboration boards accidentally overexposed?”**

Many teams share Miro links for speed, but over time those links can stay public, editing access can be too broad, and old boards can continue to contain sensitive project information.

This app helps by:

- scanning accessible boards and highlighting common risk patterns,
- probing pasted board URLs to see if they appear publicly viewable, protected, or unreachable,
- presenting findings in a simple dashboard with practical remediation guidance,
- allowing CSV export for reporting and follow-up.

# Usage of scanner through https://mirothonleak.vercel.app/

If you cannot add miro account on using the scanner, go to:

- https://miro.com/app-install/?response_type=code&client_id=3458764659723440331&redirect_uri=%2Fapp-install%2Fconfirm%2F
- Add the team for the scanner usage

## OAuth Setup (Miro)

### 1) Create local env file

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required variables:

- `MIRO_CLIENT_ID`
- `MIRO_CLIENT_SECRET`

Optional:

- `MIRO_REDIRECT_URI` (recommended to set explicitly)
- `SUPABASE_URL` (for persistent storage)
- `SUPABASE_SERVICE_ROLE_KEY` (for server-side DB writes)

For local development, use:

`MIRO_REDIRECT_URI=http://localhost:3000/api/auth/miro/callback`

### 2) Configure redirect URI in Miro app settings

In your Miro Developer app configuration, add this redirect URI:

- `http://localhost:3000/api/auth/miro/callback` (local)
- `https://<your-vercel-domain>/api/auth/miro/callback` (production)

The redirect URI in Miro must exactly match the one your app uses.

### 3) Run app locally

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:3000/scanner`

Click **Sign in with Miro** to start OAuth.

### 3.1) Enable persistent database storage (Supabase)

If you want scans, probe sessions, and settings to persist across restarts:

1. Create a Supabase project.
2. In Supabase SQL editor, run the SQL in `supabase/schema.sql`.
3. Add these values to `.env.local`:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`

If these variables are missing, the app still runs using in-memory storage.

### 4) Add env vars in Vercel

In Vercel project settings → **Environment Variables**, add:

- `MIRO_CLIENT_ID`
- `MIRO_CLIENT_SECRET`
- `MIRO_REDIRECT_URI` = `https://<your-vercel-domain>/api/auth/miro/callback`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Redeploy after setting variables.
