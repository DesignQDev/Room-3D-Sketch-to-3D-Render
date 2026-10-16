# Room3D — AI Room Sketch-to-3D Render App

Photograph a hand-drawn room sketch, describe the look and feel you want, and get a
photorealistic AI render you can share with a customer over WhatsApp, SMS or email. Built from the developer brief in
`../Docs/developer-brief-3d-room-render-app.docx`.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Auth.js (NextAuth v5)** — email/password + optional Google OAuth, Prisma adapter
- **Prisma + Postgres** — Vercel Postgres, Supabase, or Neon all work
- **OpenRouter Images API → OpenAI `gpt-image-2`** — turns the sketch photo (sent as a
  reference image) plus the user's style description into a photorealistic render.
  Runs as a background job (`after()`), polled by the render page. Falls back to a
  **demo mode** (the sketch is returned as the "render", no cost) when no key is set
- **sharp** — thumbnails and ~1200px link-preview images (chat apps skip big previews)
- **Resend** — transactional email (verification, password reset, "email it from
  Room3D"), with a **demo mode** fallback that logs instead of sending
- **Stripe Billing** — Pro subscription checkout/portal, with a **demo mode** toggle
  fallback for local testing without a Stripe account

Every paid third-party integration (OpenRouter, Resend, Stripe, Google OAuth) is
optional — the app runs the whole signup → sketch → render → share → upgrade loop out
of the box in demo mode, and switches to the real service automatically once the
matching API key is in `.env`.

## How a render works

1. **Sign up / log in** (required) → upload or take a photo of a sketch (`/new`).
2. The user picks a room type and view, and describes the look and feel.
3. `POST /api/renders` validates, enforces the free-tier cap, stores the sketch and
   returns an id immediately; `lib/render-job.ts` generates in the background
   (`lib/imagegen.ts` builds the prompt and calls OpenRouter).
4. `/render/[id]` polls `GET /api/renders/[id]` until the render is ready.
5. The user shares it: native share sheet (sends the image on phones), WhatsApp, SMS,
   email, copy link or download. Links go to a public page, `/s/[token]`, whose
   unguessable token is the access control; `/api/image/[token]?variant=preview`
   serves the small preview image used by chat link previews.

Renders are stored in Postgres (base64 in `Render.imageData`) — fine at pilot scale;
move to object storage (e.g. Vercel Blob) once volume grows.

## Database

The app needs a Postgres database — locally and in production. Free options that work
well:

- **Vercel Postgres** (Neon-backed) — in your Vercel project, go to the **Storage** tab →
  Create Database → Postgres. It gives you a connection string; set that as `DATABASE_URL`
  in your Vercel project's environment variables.
- **Supabase** or **Neon** directly — create a project, copy the connection string
  (use the "connection pooling" string if offered, or the direct one — either works for
  this app's traffic level) into `DATABASE_URL`.

Use the same connection string locally in `.env` (or provision a second free instance for
local dev if you'd rather not share data between dev and prod).

Once `DATABASE_URL` points at a real Postgres, apply the schema:

```bash
npx prisma migrate deploy
```

`npm run build` also runs this automatically (via `scripts/migrate-deploy.mjs`), so a
first deploy to Vercel with `DATABASE_URL` set will provision the schema on its own. The
script migrates over `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING` when present
(Neon's Vercel integration sets these), retries if Prisma's 10-second migration lock
times out (error `P1002`), and as a last resort runs once without the lock rather than
failing the deploy.

## Getting started

```bash
npm install
# set DATABASE_URL in .env to a real Postgres connection string (see above)
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000. Sign up, upload/paste a sketch photo, confirm dimensions,
and generate a render — no other API keys are required for this to work end to end.

## Environment variables

See `.env.example`. `DATABASE_URL` and `AUTH_SECRET` are required (see Database section
above; generate a real `AUTH_SECRET` with `npx auth secret` for anything beyond local dev
— **do not use the .env.example placeholder in production**). Everything else is optional
— add keys as you're ready to go live with each integration:

| Var | Enables |
|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | "Continue with Google" |
| `OPENROUTER_API_KEY` | Real image generation (else: demo mode returns your sketch). Optional: `OPENROUTER_IMAGE_MODEL` (default `openai/gpt-image-2`), `OPENROUTER_IMAGE_QUALITY` (`low`/`medium`/`high`, default `medium`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Real email delivery (else: emails are logged to the `EmailLog` table and shown in-app) |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID_PRO` / `STRIPE_WEBHOOK_SECRET` | Real Stripe Checkout + billing portal (else: a local "toggle Pro" endpoint stands in) |

Generate `AUTH_SECRET` for anything beyond local dev with `npx auth secret`.

## What's implemented

Product direction (client brief): users must sign up; logged-in users upload or photograph
a sketch, describe the look and feel they want, get a generated render, and share it with
their customer via WhatsApp/SMS etc. (This replaced the original structured-scene + Three.js
3D viewer approach in the developer brief.)

- **Sign-up & auth** — email/password + optional Google OAuth, required consent checkbox,
  email verification, password reset, logout (clears session and local cached data).
- **Sketch capture** — drag-and-drop, clipboard paste, file picker, mobile camera capture;
  manual rotate/crop/brightness/contrast.
- **Look and feel** — free-text style description with one-tap style ideas, room type, and a
  choice of cutaway-from-above or eye-level view.
- **Render generation** — OpenRouter → `openai/gpt-image-2`, with the sketch as a reference
  image; background job with a progress screen; failures are captured and shown.
- **Sharing** — native share sheet, WhatsApp, SMS, email app, copy link, download; public
  share page with link-preview images; optional server-sent email via Resend.
- **Monetization** — server-side cost tracking per user (`UsageEvent`, using the cost
  OpenRouter reports) enforces the US$10 free-tier cap (hard stop → 402 → `/pricing`);
  Stripe Checkout + Billing Portal handle upgrade/downgrade/cancel when configured.

## Open questions from the original brief (section 6) — defaults chosen

1. **Native vs. web** → **web-first** (mobile-responsive Next.js).
2. **Data retention** → drafted as "kept while the account is active, deleted within 90
   days of account deletion" in `/privacy` — not yet enforced by an automated job.
3. **Interactive vs. static** → now a static image render (per the client direction).
4. **Free-tier cap behavior** → **hard stop** once US$10 of tracked spend is reached.

## Project structure

- `app/` — routes (pages + `api/*` route handlers)
- `components/` — client UI (uploader, render view, sharing, forms)
- `lib/` — auth, prisma client, image generation (`imagegen.ts`, `render-job.ts`), email, billing, usage-cap logic
- `prisma/schema.prisma` — data model
