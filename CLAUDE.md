# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Dev/test workflow:

- `npm run dev` — Next.js dev server on port **3030** (foreground).
- `npm run slides-up` / `npm run slides-down` / `npm run slides-logs` — background dev server bound to port 3030; PID and logs live in `.slidebuilder.pid` / `.slidebuilder.log` at the repo root. `slides-up` refuses to start if the port is in use; `slides-down` kills both the tracked PID and anything else holding the port.
- `npm run build` — production build. `next.config.ts` sets `output: "standalone"`, which is what `Dockerfile` copies into the runtime stage.
- `npm run start` — start the built server (port 3030).
- `npm run lint` — ESLint via `eslint-config-next` (`core-web-vitals` + `typescript`).
- `npm run test` — Vitest (Node env). `npm run test:watch` for watch mode. Run a single file: `npx vitest run src/lib/exportPptx.test.ts`. Tests are colocated next to the code (`src/**/*.test.ts`) — currently only `src/lib/exportPptx.test.ts` exists.

There is no typecheck script; rely on `npm run build` or `npx tsc --noEmit` if you need explicit type validation. The project uses the `@/*` path alias (mapped to `./src/*`).

## Architecture

### Top-level shape

Next.js 16 App Router with React 19 and Tailwind v4. The app is a **single authed page** (`src/app/page.tsx`) that switches between a project list (`ProjectManager`) and a 3-step wizard (`StepWizard`). Routing through `src/middleware.ts` forces every non-auth path through NextAuth (Google OAuth only); unauthenticated requests are redirected to `/login`. All state lives in the browser — there is no application database.

### Three storage layers, no shared backend DB

1. **Zustand stores** (`src/store/*`) hold live UI state. `presentationStore` is the wizard's working copy (global prompt, templates, slides, chat, active step). `projectStore` mirrors saved projects. `costStore` tracks API spend.
2. **IndexedDB** (`src/lib/idb.ts`) persists projects, generated templates, and cost events. The DB name is namespaced per signed-in user: `slidebuilder-<userId>`. After login, `src/app/page.tsx` calls `setIdbUserId(session.user.id)` before any IDB read — **anything that opens the DB before this call hits the anonymous `slidebuilder` DB and won't see the user's data.** DB version is `3`; bumping it requires extending `onupgradeneeded`.
3. **Supabase** (`src/lib/supabase.ts`) is wired up but optional — the client is `null` unless `NEXT_PUBLIC_SUPABASE_*` env vars are set. It's reserved for future usage/cost aggregation; no current code path requires it.

Autosave is a debounced (3s) effect inside `src/app/page.tsx` (`useAutoSave`) that writes the presentation state back to IDB when its JSON fingerprint changes. It only runs when `activeProjectId` is set.

### The 3-step wizard

`StepWizard` (`src/components/StepWizard.tsx`) switches on `presentationStore.currentStep`:

1. `GlobalRulesStep` — captures `globalPrompt`, `negativePrompt`, `aspectRatio`.
2. `TemplateGallery` — calls `/api/generate-templates` to produce 4 variations, or uploads an image to `/api/analyze-template`. Selected template seeds slide generation. There's also a `BLANK_TEMPLATE_ID` sentinel (`src/lib/template.ts`) — when selected, slide generation skips the image input and builds from scratch.
3. `SlideBuilder` / `AtelierWorkspace` — per-slide concept editing, regeneration, refinement chat, inpainting, speaker notes, export.

`AtelierWorkspace.tsx` is the largest component and orchestrates most of the slide-level UX. `SlideInspector`, `RefinementChat`, `CanvasOverlay`, and `TemplateEditor` are sub-views it composes.

### API routes and the Gemini layer

All AI routes live under `src/app/api/*/route.ts`. They share a strict pattern:

1. Call `requireAuth()` (`src/lib/requireAuth.ts`) first; bail with 401 if no session.
2. Get a singleton client from `getGeminiClient()` (`src/lib/gemini.ts`). The client picks **API key mode** if `GEMINI_API_KEY` is set, otherwise **Vertex AI / ADC mode** using `GOOGLE_CLOUD_PROJECT` (+ optional `GOOGLE_CLOUD_LOCATION`). Throws if neither is configured.
3. Use `IMAGE_MODEL_ID` (default `gemini-3-pro-image-preview`) for image generation and `TEXT_MODEL_ID` (default `gemini-2.5-flash`) for text. Both are overridable via env.
4. On 400/403, normalize the model's error with `extractGeminiErrorMessage()` (`src/lib/geminiError.ts`) so safety-policy messages reach the UI verbatim.

Notable route specifics:

- `generate-slide/route.ts` — the longest and most prompt-engineered route. It builds a typography-heavy prompt, appends caller-supplied negatives plus a fixed legibility blocklist, supports variation indexing, accepts `reservedZones` (kept empty for later overlay compositing), and **automatically retries in "strict text mode"** if the first response's text mentions legibility failure signals.
- `generate-templates/route.ts` — fires 4 parallel `Promise.allSettled` generations with hand-tuned style variations; if any single call returns a safety error, the whole route returns that error.
- `inpaint/route.ts` — converts percent-based mask bounds to a textual region description (Gemini doesn't take pixel masks here).
- `refine/route.ts` — conversational image edit; truncates `chatHistory` to the last 6 messages.
- `auth/[...nextauth]/route.ts` + `src/lib/auth.ts` — NextAuth with the Google provider only. JWT subject is copied onto `session.user.id` (also typed in `src/types/next-auth.d.ts`).

### Export paths

- `src/lib/exportPptx.ts` — every slide becomes a single full-bleed image plus speaker notes. Hybrid editable mode is referenced in the store (`pptxExportMode`) but the current `buildPptxBlob` is image-only. Slides without `image_url` are silently skipped; the test (`exportPptx.test.ts`) mocks `pptxgenjs` and pins this behavior.
- `src/lib/exportPdf.ts` — `jspdf`-based PDF export.
- `src/lib/importPptx.ts` — `jszip`-based PPTX → slides import (text-only).
- `src/lib/compositeOverlays.ts` — runs in the browser via canvas; takes percent-based overlay coordinates so they survive resolution changes. Used for graphic overlays that should sit on top of the generated slide image.

### Costs

`src/lib/calculateCost.ts` hard-codes per-image and per-token prices (Gemini 3 Pro Image Preview at 4K, Gemini 2.5 Flash text). `costStore.addCost()` writes a `CostEventRecord` to IDB on every billable call, then recomputes daily/weekly/monthly breakdowns. There's a 13-month retention sweep inside `fetchBreakdown()`.

## Environment

Required for any AI route to work: `GEMINI_API_KEY` **or** `GOOGLE_CLOUD_PROJECT` (Vertex/ADC). Required for auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`. See `.env.example` for the full list. Production deployment runs on GCE with Vertex AI via the VM's service account — see `deploy/DEPLOY.md`.

## Conventions worth following

- **Auth gate every API route.** Every existing route starts with `const { error } = await requireAuth(); if (error) return error;` — match this.
- **Never bypass the Gemini singleton.** Routes call `getGeminiClient()` so API-key vs ADC selection stays in one place.
- **Base64 images are passed without the `data:` prefix** across all internal APIs and IDB. The `image_url` field on `Slide` is the only place a full data URL is stored (it's used directly as a `src=` and as PPTX image data).
- **Slide model has legacy fields.** `title`, `subtitle`, `bullets` exist on `Slide` for backward compatibility with older saved projects but the current generation pipeline doesn't read them — don't add new dependencies on them.
- **IDB user namespacing is load-bearing.** If you add new IDB call sites, ensure they run after `setIdbUserId` in `src/app/page.tsx`, or accept that the data goes into the anonymous DB.
