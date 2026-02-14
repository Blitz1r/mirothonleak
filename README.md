# MiroLeak

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

### 4) Add env vars in Vercel

In Vercel project settings → **Environment Variables**, add:

- `MIRO_CLIENT_ID`
- `MIRO_CLIENT_SECRET`
- `MIRO_REDIRECT_URI` = `https://<your-vercel-domain>/api/auth/miro/callback`

Redeploy after setting variables.