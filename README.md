# Lucrative Design

This repo now contains the public site plus a simple `/admin` dashboard for editing:

- project names
- project categories
- project summaries
- hero images
- gallery images
- image captions / descriptions
- homepage copy and contact details

## Local dev

Use the plain Vite server when you're only checking the public site:

```bash
pnpm dev
```

Use the Vercel dev server when you want the admin dashboard and API routes to work locally:

```bash
pnpm dev:vercel
```

## Environment variables

Copy `.env.example` to your local env setup and fill these in:

- `ADMIN_PASSWORD`: required for `/admin` login
- `ADMIN_SESSION_SECRET`: optional, but good to set separately
- `AWS_REGION`: AWS region containing the dedicated S3 bucket
- `S3_BUCKET_NAME`: dedicated S3 bucket for site content and assets
- `S3_PUBLIC_BASE_URL`: public base URL for objects under the `assets/` prefix
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`: least-privilege credentials for the Vercel runtime; never use root credentials here
- `S3_MAX_UPLOAD_BYTES`: optional safety limit for direct browser uploads, defaulting to 100 MB

The admin saves authoritative content JSON to S3 and requests presigned upload URLs so image bytes go directly from the browser to S3. This avoids Vercel function request-body limits and does not impose the old 4 MB multipart limit.

Without S3 configuration, local development falls back to a local JSON file. On Vercel, saves and uploads are disabled with an explicit storage warning because the deployed filesystem is not durable. The production admin dashboard reports the active AWS S3 storage mode before an editor attempts to save.
