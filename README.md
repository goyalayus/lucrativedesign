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

Without `BLOB_READ_WRITE_TOKEN`, the admin falls back to local file storage for development.
