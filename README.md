# Room3D — AI Room Sketch-to-3D Render App

Photograph a hand-drawn room sketch, confirm the dimensions, and get a navigable 3D
render in-browser that you can email to a customer. Built from the developer brief in
`../Docs/developer-brief-3d-room-render-app.docx`.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Auth.js (NextAuth v5)** — email/password + optional Google OAuth, Prisma adapter
- **Prisma + Postgres** — Vercel Postgres, Supabase, or Neon all work
- **Three.js via @react-three/fiber** — interactive 3D room viewer
- **Claude API (Anthropic SDK)** — vision-based sketch interpretation, with a
  deterministic **demo mode** fallback when no API key is set
- **Resend** — transactional email (verification, password reset, "send to customer"),
  with a **demo mode** fallback that logs instead of sending
- **Stripe Billing** — Pro subscription checkout/portal, with a **demo mode** toggle
  fallback for local testing without a Stripe account

Every paid third-party integration (Claude, Resend, Stripe, Google OAuth) is optional —
the app runs the full signup → sketch → 3D render → email → upgrade loop out of the box
in demo mode, and upgrades to the real service automatically once you add the matching
API key to `.env`.

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

`npm run build` also runs this automatically (see `package.json`), so a first deploy to
Vercel with `DATABASE_URL` set will provision the schema on its own.

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
| `ANTHROPIC_API_KEY` | Real Claude vision sketch interpretation (else: demo scene generator) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Real email delivery (else: emails are logged to the `EmailLog` table and shown in-app) |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID_PRO` / `STRIPE_WEBHOOK_SECRET` | Real Stripe Checkout + billing portal (else: a local "toggle Pro" endpoint stands in) |

Generate `AUTH_SECRET` for anything beyond local dev with `npx auth secret`.

## What's implemented (brief section 2)

- **2.1 Registration & Auth** — email/password + optional Google OAuth, required consent
  checkbox before submit, email verification flow, password reset flow, logout (clears
  session + any locally cached sketch/render data).
- **2.2 Sketch capture** — drag-and-drop, clipboard paste, file picker, and mobile camera
  capture; manual rotate/crop/brightness/contrast adjustment; dimension confirmation
  fields before submitting, since handwritten dimensions aren't reliably OCR'd.
- **2.3 AI-generated 3D render** — image + confirmed dimensions sent to Claude's vision
  API (`lib/ai.ts`), which returns a structured JSON scene (walls/openings/fixtures) via
  a tool call; that scene renders as an interactive, orbit-controllable 3D model
  (`components/RoomViewer3D.tsx`). A progress indicator with rotating status messages
  covers the 10–60s processing window.
- **2.4 Email to customer** — "Send to customer" form on the render page; captures the 3D
  view as a screenshot, attaches it + a link, logs every send in `EmailLog`.
- **2.5 Monetization** — server-side token/cost tracking per user (`UsageEvent` table)
  enforces the US$10 free-tier cap (hard stop — see open question below); Stripe
  Checkout + Billing Portal wire up upgrade/downgrade/cancel when configured.
- **2.6 Logout** — clears the session and any `room3d:*` localStorage entries.

## Open questions from the brief (section 6) — defaults chosen for this build

These were flagged in the brief as needing stakeholder sign-off. Sensible defaults were
picked so the app is fully buildable and testable; revisit before launch:

1. **Native vs. web** → built **web-first** (mobile-responsive Next.js), per the user's
   request and the brief's own suggested stack.
2. **Data retention** → drafted as "kept while the account is active, deleted within 90
   days of account deletion" in `/privacy` — not yet enforced by an automated job.
3. **Interactive vs. static 3D** → built **interactive** (orbit/zoom in-browser) with a
   static PNG export option alongside it.
4. **Free-tier cap behavior** → implemented as a **hard stop**: once US$10 of tracked
   Claude spend is reached, `/api/renders` returns 402 and the UI routes to `/pricing`.

## Project structure

- `app/` — routes (pages + `api/*` route handlers)
- `components/` — client UI (uploader, 3D viewer, forms)
- `lib/` — auth, prisma client, AI interpretation, email, billing, usage-cap logic
- `prisma/schema.prisma` — data model
