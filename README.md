# SlideBuilder

SlideBuilder is a local-first slide creation app powered by Gemini image and text generation.

## Features

- **Style-first workflow**: define global design rules, or upload a reference slide and let Gemini learn its style.
- **Direct template upload**: drop in a background image and use it as-is (no AI analysis), or generate template variations from a prompt.
- **Template generation and selection**, including a blank-canvas option.
- **Per-slide concept prompts** with title/subtitle/bullets.
- **Slide reordering** in the sidebar via drag-and-drop or up/down buttons.
- **First-slide style carry-forward**: the rendered first slide is passed as a locked style reference so later slides stay visually consistent across the deck (toggleable, on by default).
- **Second-pass QA check**: after a slide renders, Gemini vision inspects it for spelling, legibility, and instruction-adherence issues and flags them (toggleable, on by default — flags only, never auto-edits).
- **AI image refinement** via chat and inpaint region editing.
- **Speaker notes generation.**
- **Local project persistence** in IndexedDB.
- **Export to PPTX and PDF.**

## Requirements

- Node.js 20+ recommended
- npm 10+
- A Gemini API key

## Environment variables

Create a `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

### AI access (required — pick one)

- `GEMINI_API_KEY`: Gemini API key. Used by all AI API routes. Simplest for local dev.
- _or_ `GOOGLE_CLOUD_PROJECT` (+ optional `GOOGLE_CLOUD_LOCATION`, default `us-central1`): use Vertex AI via Application Default Credentials instead of an API key.

### Authentication

The app is gated behind Google OAuth by default. For local development you can skip sign-in entirely:

- `SKIP_AUTH=true`: bypass Google OAuth (login page and per-route auth checks). **Local dev only** — do not set this in production.

When `SKIP_AUTH` is not set, configure OAuth:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` (e.g. `http://localhost:4040`)

### Model overrides (optional)

- `IMAGE_MODEL_ID`: image generation model (default: `gemini-3-pro-image-preview`). Used by slide/template generation, inpaint, and refine.
- `TEXT_MODEL_ID`: text/vision model (default: `gemini-2.5-flash`). Used by template analysis, the QA check, speaker notes, and prompt strengthening.

### Future usage/cost storage (optional)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Install and run

```bash
npm ci
npm run dev
```

Open [http://localhost:4040](http://localhost:4040).

For a quick local run without setting up OAuth, put `SKIP_AUTH=true` and `GEMINI_API_KEY=...` in `.env.local` first.

## Scripts

- `npm run dev`: start Next.js development server on port `4040`.
- `npm run build`: production build.
- `npm run start`: run production server on port `4040`.
- `npm run lint`: run ESLint.
- `npm run test`: run the Vitest test suite.
- `npm run slides-up`: start dev server in the background with logs in `/tmp/slidebuilder.log` (honors `PORT`, default `3030`).
- `npm run slides-down`: stop the background process bound to that port.
- `npm run slides-logs`: tail background logs.

## Models

| Purpose | Default model | Routes |
| --- | --- | --- |
| Image | `gemini-3-pro-image-preview` | `generate-slide`, `generate-templates`, `inpaint`, `refine` |
| Text / vision | `gemini-2.5-flash` | `analyze-template`, `qa-check`, `generate-notes`, `strengthen-prompt` |

Both are overridable via `IMAGE_MODEL_ID` / `TEXT_MODEL_ID`.

## Notes

- Projects and generated slide data are stored in-browser (IndexedDB), not on a backend database.
- If `GEMINI_API_KEY` (or a Vertex AI project) is missing, API routes will return an error at request time.
- The Auto QA check adds one text/vision call per generated image (a fraction of a cent each). It can be toggled off per slide in the builder.
