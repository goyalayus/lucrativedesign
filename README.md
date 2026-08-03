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
- `BLOB_READ_WRITE_TOKEN`: required on Vercel if you want uploaded images and saved content to persist in Blob storage

Without `BLOB_READ_WRITE_TOKEN`, the admin uses local file storage only outside Vercel. On Vercel, saves and uploads are disabled with an explicit storage warning because the deployed filesystem is not durable.

The `lucrativedesign` Vercel project must have `BLOB_READ_WRITE_TOKEN` connected for Development, Preview, and Production, followed by a new deployment after environment changes. The production admin dashboard reports the active storage mode so configuration problems are visible before an editor attempts to save.
