# SlideBuilder

SlideBuilder is a local-first slide creation app powered by Gemini image and text generation.

## Features

- Style-first workflow: define global design rules or upload a reference slide.
- Template generation and selection.
- Per-slide concept prompts, title/subtitle/bullets.
- AI image refinement via chat and inpaint region editing.
- Speaker notes generation.
- Local project persistence in IndexedDB.
- Export to PPTX and PDF.

## Requirements

- Node.js 20+ recommended
- npm 10+
- A Gemini API key

## Environment variables

Create a `.env.local` file from `.env.example`:

```bash
cp .env.example .env.local
```

Required:

- `GEMINI_API_KEY`: used by all AI API routes.

Optional (model overrides):

- `IMAGE_MODEL_ID`: image generation model (default: `gemini-3-pro-image-preview`).
- `TEXT_MODEL_ID`: text/intelligence model (default: `gemini-2.5-flash`).

Optional (future usage/cost storage):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Install and run

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev`: start Next.js development server.
- `npm run build`: production build.
- `npm run start`: run production server.
- `npm run lint`: run ESLint.
- `npm run slides-up`: start dev server in background with logs in `/tmp/slidebuilder.log`.
- `npm run slides-down`: stop any process bound to port `3000`.
- `npm run slides-logs`: tail background logs.

## Notes

- Projects and generated slide data are stored in-browser (IndexedDB), not on a backend database.
- If `GEMINI_API_KEY` is missing, API routes will return an error at request time.
