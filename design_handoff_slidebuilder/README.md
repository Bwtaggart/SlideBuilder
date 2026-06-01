# Handoff: SlideBuilder UX Redesign — "Atelier"

## Overview

A redesign of SlideBuilder, an AI-assisted deck creation tool. The redesign retires the old multi-step wizard in favor of a calmer, editorial workspace where the **outline, stage, and inspector are always visible** and contextual drawers (Discuss, Style) slide in over the workspace rather than navigating away from it.

The flow covers **six screens** end-to-end:
1. **Home** — returning user with project grid + monthly cost summary
2. **Home (empty)** — first-run state with three quick-start templates
3. **Template gallery** — full-screen browseable library + AI fallback ("describe a template")
4. **Generating** — per-slide skeleton outline as deck renders, with live progress + run cost
5. **Workspace** — the editor: outline left, stage centre, inspector form below stage, contextual right-drawer for Discuss / Style
6. **Export** — modal over the workspace; format → fidelity → filename

A "full clickable flow" artboard wires all six together so reviewers can drive the prototype themselves.

## About the Design Files

The files in `prototype/` are **design references created in HTML/JSX** — interactive prototypes showing intended look and behavior, not production code to copy directly.

Your task is to **recreate these designs in the target codebase's environment** (the existing SlideBuilder app — see `src/` in the parent project) using its established patterns, libraries, and design tokens. The prototype JSX is intentionally self-contained and inline-styled for fast iteration; production implementation should use the codebase's component library, styled-components / CSS modules / tokens system, and route/state management.

If no codebase yet exists for a given target, choose the most appropriate framework (likely React + a CSS-in-JS or Tailwind setup, given the prototype) and implement there.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, copy, and interactions are decided. Match pixel-for-pixel where reasonable. The design tokens section below has exact values.

The only deliberately-faked surfaces are:
- **`<FauxSlide>`** — renders gradient + grid + Fraunces title as a placeholder for what is, in production, an AI-generated slide image. Replace with the real slide-render pipeline.
- **AI calls** — "Generate template", "Regenerate", "Inpaint region" buttons are wired up visually but no-op. Hook them to the real model endpoints.
- **Sample data** in `mock-data.jsx` (`SAMPLE_SLIDES`, `SAMPLE_PROJECTS`, `SAMPLE_TEMPLATES`, `SAMPLE_CHAT`) — replace with real store/API data.

---

## Design Tokens

### Colors

| Role | Value | Notes |
|---|---|---|
| Background (canvas) | `#faf8f4` | Warm off-white. Page background. |
| Background (sidebar) | `#f3efe5` | Slightly darker warm tone for outline rail / filter rail. |
| Surface (card) | `#ffffff` | Cards, inputs, drawer. |
| Surface (hover) | `#ede5d2` | Hover tint on outline rows + skeletons. |
| Border (default) | `#e8e1cf` | Card borders, dividers. |
| Border (input) | `#e2dccd` | Inputs only — slightly more saturated. |
| Border (button rest) | `#d8d2c4` | |
| Text (primary) | `#1a1a1a` | Body, titles. |
| Text (secondary) | `#7a6f56` | Warm muted brown. Labels, meta, caption. |
| Text (placeholder swatch) | `#bdb29a` | "+" glyph in blank-canvas tile. |
| Cost-pill bg | `#1a1a1a` | Dark pill, monospace. |
| Cost-pill text | `#faf8f4` | |
| **Accent (default)** | `#1a3a3a` | Deep teal. Primary brand color. |
| Accent alternates | `#5b3a29`, `#283593`, `#5e1742`, `#0d4f3c` | Curated swatch options exposed in Tweaks. |
| Accent overlay (`accent + 08`) | e.g. `#1a3a3a14` | Selected-state card backgrounds. |
| Accent overlay (`accent + 10`) | e.g. `#1a3a3a1A` | Inline callouts. |
| Accent overlay (`accent + 15`) | e.g. `#1a3a3a26` | Chip backgrounds. |
| Accent overlay (`accent + 20`) | e.g. `#1a3a3a33` | Focus ring. |
| Accent overlay (`accent + 30`) | e.g. `#1a3a3a4D` | Skeleton ring, callout border. |
| Accent overlay (`accent + 40`) | e.g. `#1a3a3a66` | Callout border (denser). |

The accent is a **single token**; everywhere else that uses it appends a 2-digit hex alpha. In production, expose accent as a CSS custom property and use `color-mix()` or rgba() for overlays.

### Typography

Three families, all from Google Fonts:

| Family | Used for | Weights |
|---|---|---|
| **Fraunces** (variable, opsz 9..144) | Display, slide titles, section headlines, card titles | 400, 500, 600, 700 |
| **Inter** | UI body, buttons, inputs, labels' text | 400, 500, 600, 700 |
| **JetBrains Mono** | Eyebrow labels, slide indices, cost pill, meta numbers | 400, 500 |

Fonts are loaded via:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

Replace with whatever font-loading strategy the codebase uses (next/font, fontsource, self-hosted, etc.).

#### Type scale

| Token | Size | Weight | Family | Usage |
|---|---|---|---|---|
| display-xl | 56px | 400 | Fraunces | Home hero headline |
| display-lg | 54px | 400 | Fraunces | Empty-state hero |
| display-md | 42px | 500 | Fraunces | Readme card hero |
| display-sm | 34px | 400 | Fraunces | Cost number |
| title-lg | 24px | 400 | Fraunces | Modal title |
| title-md | 22px | 400 | Fraunces | Slide-index header in inspector |
| title-sm | 18px | 400 | Fraunces | Drawer title, project card |
| title-xs | 16px | 400 | Fraunces | Topbar project name |
| body | 13–15px | 400 | Inter | Body text |
| label-eyebrow | 11px / 0.1em tracking / uppercase | 600 | Inter | Form labels (`atl-label`) |
| label-mono | 10–11px / 0.06–0.18em tracking / uppercase | 400 | JetBrains Mono | Meta, eyebrows, slide index |
| caption | 12px | 400 | Inter | Secondary text |

Display headlines use **letter-spacing: -1 to -1.5px** and **line-height: 1.05**. Body text is line-height 1.5–1.65.

### Spacing scale

Inline values in the prototype, but they cluster around an 4/8 grid:
`4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 48, 56, 72`. Map to your existing scale.

### Radius

| Token | Value | Usage |
|---|---|---|
| radius-input | 6px | Inputs, buttons |
| radius-card | 10px | Cards, modal |
| radius-thumb | 4px | Outline-row thumbnails |
| radius-pill | 99px | Chips |
| radius-circle | 50% | Avatars, status dots |

### Shadows

| Token | Value | Usage |
|---|---|---|
| shadow-stage | `0 30px 60px rgba(26,26,26,.08), 0 0 0 1px #e8e1cf` | The slide stage card |
| shadow-modal | `0 40px 80px rgba(0,0,0,.18)` | Export modal |
| shadow-drawer | `-20px 0 40px rgba(0,0,0,.05)` | Right drawer (Discuss/Style) |
| shadow-tile-hover | `0 14px 30px rgba(0,0,0,.06)` | Project tile / template tile lift |
| shadow-button-pri-hover | `0 4px 14px ${accent}30` | Primary button hover |

### Motion

- All hover transitions: **150ms** on `background`, `border-color`, `color`.
- Tile lift on hover: `transform: translateY(-3px)`, **200ms**.
- Drawer slide-in: 200ms ease.
- Loading shimmer: 1.6s linear infinite (`@keyframes atl-shimmer`).
- Loading pulse dot: 1s infinite (`@keyframes atl-pulse`).
- Spinner: 0.9s linear (`@keyframes atl-spin`).
- Generating screen advances one slide per **1100ms** (timer; replace with real progress).

---

## Screens / Views

For each, see the matching component in `prototype/proto-atelier.jsx`.

### 1. Home (returning user) — `<AtelierHome>`

**Purpose:** Land here on app open. See projects in flight + monthly cost, start a new deck, or open a recent.

**Layout:**
- Topbar (full-width, 18×32 padding, bottom border): logo dot + "Slidebuilder" wordmark on left; Restore-backup ghost button + cost pill + primary "New deck" on right.
- Main content centered, `max-width: 1100px`, padding `56px 32px 80px`.
- Hero row: 2-column grid (`1fr auto`, gap 24px). Left = mono eyebrow + 56px Fraunces headline ("Six decks in flight, *three* due this week.") with `<em>` in accent color and `text-wrap: pretty`. Right = "This month" cost card (260px min-width) showing `$12.40` + breakdown.
- Project grid below: `repeat(3, 1fr)`, gap 20px. Each tile = card with 4:3 gradient thumb + body (project name in 18px Fraunces + meta row with mono slide count + relative timestamp).

**Components:**
- **Topbar** — flex justify-between. Logo dot 28×28 round in accent.
- **Cost pill** (`.atl-cost`) — dark `#1a1a1a` pill, JetBrains Mono 11px, dollar icon + amount.
- **New deck button** — primary (accent bg, off-white text, plus icon).
- **Project tile** (`.atl-card.atl-tile`) — white card, 1px `#e8e1cf` border, 10px radius. Hover: `translateY(-3px)` + soft shadow. Thumb is the slide gradient at 4:3.

**Interactions:**
- Click tile → open Workspace with that project loaded.
- Click "New deck" → navigate to Template gallery.
- Hover tiles: lift + shadow.

### 2. Home (empty / first-run) — `<AtelierHome empty>`

**Purpose:** First-run state. No projects yet — guide user into creating one.

**Layout:** Same topbar. Centered column (`text-align: center`, padding `72px 0`):
- Mono eyebrow "Welcome"
- 54px Fraunces headline "Begin with an *empty page*." (italic accent on "empty page")
- 15px secondary copy paragraph (max-width 520px)
- Two buttons: primary "Start a new deck" + ghost "Import .pptx"
- Below: 3-column grid (max-width 760px) of three template tiles (16:10 thumbnails) — clicking any starts a new deck with that template.

### 3. Template gallery — `<AtelierGallery>`

**Purpose:** Pick (or generate) a template. Replaces wizard step 2.

**Layout:**
- Topbar (compact, 12×24 padding): back button + title "Pick a starting template" + chip "step 1 of 2 · style". Right: "Upload reference" + primary "Use template →".
- Body grid: `240px 1fr` (sidebar + content), full height.
- **Sidebar** (`.atl-side`, `#f3efe5` bg, 1px right border, 18×14 padding): "Filter" eyebrow + four filter buttons (All, Editorial, Pitch & investor, Tech / data). Selected filter = white bg + accent border + accent text. Below: "Or describe" eyebrow + textarea (4 rows) + primary "Generate template" button.
- **Content**: 3-column grid of template cards (gap 18px). Each card: 16:10 thumbnail (gradient bg) + body row with template name (Fraunces 15px) + tag (mono uppercase 10px). Selected card = 2px accent border + small accent circle with check icon.

**Interactions:**
- Click filter → narrow grid.
- Click card → mark selected (visual only — primary button confirms).
- "Use template" → navigate to Generating.
- "Generate template" → AI describes-to-template flow (placeholder).

### 4. Generating — `<AtelierGenerating>`

**Purpose:** Live progress while the deck renders. User sees the outline filling in, current slide rendering, and cost ticking up.

**Layout:**
- Topbar (the standard `AtelierTopbar` with project name, "generating · auto-saved" status chip, cost pill).
- Body grid: `380px 1fr`.
- **Left rail** (`.atl-side`):
  - Header row: "Outline · 6 slides" eyebrow + mono `3/6` counter in accent.
  - List of outline rows. Each row = thumb (64×40, gradient if rendered, skeleton shimmer if pending) + slide index + status (rendered / rendering… with pulsing dot / queued) + Fraunces title + secondary subtitle.
  - The row currently rendering uses the `.on` highlight (white bg + 3px inset accent left edge).
- **Right pane** (centered, padding 32):
  - Slide stage at max-width 760px, `aspect-ratio: 16/9`, with stage shadow.
  - When rendering: `<FauxSlide>` underneath + a `.86`-opacity warm overlay containing a 46px spinner (3px accent ring), uppercase mono caption "Rendering slide N", and the slide title in Fraunces 22px.
  - Below stage: 4px progress bar (track `#ede5d2`, fill accent, 300ms width transition). Below that: caption row split — "Generating deck · 3/6 rendered" left, "+$0.18 this run" right (mono).
  - Below: ghost button "Stop and review what's done".

**Interactions:**
- Each tick (1100ms in the prototype — replace with real backend progress events) advances to the next slide.
- "Stop and review" → switches user to Workspace with however many slides are done.

### 5. Workspace — `<AtelierWorkspace>`

**Purpose:** The editor. The screen where users actually build.

**Layout:**
- Standard `AtelierTopbar`: home back-button, accent dot, project name in Fraunces 16px, status chip "draft · auto-saved", and on the right: Templates / Style / Discuss buttons + primary "Export" + cost pill. Templates and Style/Discuss open the right drawer or navigate to gallery.
- Body grid: `380px 1fr` — outline left, stage+inspector right.
- **Outline rail** (left):
  - Header: "Outline · N slides" + small ghost "+ Add" button.
  - Scrollable list of outline rows (same component as Generating, but no skeletons — all "rendered"). Click sets `activeIdx`. Active row uses `.on` style.
- **Stage + Inspector** (right, single scroll container):
  - Stage card: max-width 880px, 16:9, stage shadow. Renders `<FauxSlide>` of active slide.
  - Stage toolbar (centered, gap 6px): ghost buttons — Regenerate (sparkles), Inpaint region (image), Variations · 1 (copy), Trash. Wire to slide-level AI actions.
  - Inspector card (max-width 880px, white card, 24px padding):
    - Fraunces 22px header "Slide 0N"
    - 2-column grid (Title / Subtitle inputs)
    - Concept textarea (3 rows) — the prompt that drives image generation
    - Bullets textarea (4 rows, newline-delimited)
    - `<details>` Speaker notes (collapsed by default; opens to a 4-row textarea)
- **Drawer** (right, 380px, white bg, slides over):
  - Header: Fraunces 18px title ("Discuss this slide" or "Deck style") + close X.
  - **Discuss mode**: scrollable message list — user msgs right-aligned in accent bubble + off-white text, assistant msgs left-aligned in `#f3efe5` bubble + dark text. Footer: input + primary send button.
  - **Style mode**: form — Direction textarea, Avoid input, Aspect 3-button toggle (16:9 / 4:3 / 9:16), Templates 2×N grid of small thumbs, primary "Apply to deck" full-width button.

**State:**
- `slides` — array of slide objects (see SAMPLE_SLIDES shape: `{ id, title, subtitle, bullets[], prompt, notes, bg, accent }`).
- `activeIdx` — currently selected slide index.
- `drawer` — `null | 'discuss' | 'style'`. Toggle by clicking the topbar buttons; X in drawer or clicking the same button closes.
- All inspector inputs are controlled and write back into `slides[activeIdx]` immutably.

**Interactions:**
- Click outline row → set `activeIdx`.
- Edit title/subtitle/concept/bullets/notes → live update; also triggers auto-save (in prod).
- Topbar Style or Discuss → open/close drawer (toggle).
- Topbar Templates → navigate to gallery (same screen).
- Topbar Export → open Export modal.
- Topbar back arrow → return to Home.

### 6. Export modal — `<AtelierExport>`

**Purpose:** Final step. Choose format + fidelity + filename, hit Export.

**Layout:**
- Backdrop: `rgba(26,26,26,.42)`, covers viewport below the topbar.
- Modal card: max-width 680px, 10px radius, modal shadow, white bg, centered.
- **Header** (20×26 padding, bottom border): mono eyebrow "Export" + Fraunces 24px "Send the deck out into the world" + close X (top right).
- **Body** (22×26 padding, vertical gap 18):
  - "Format" — 2-column grid of two cards: PowerPoint (.pptx) | PDF. Selected = 2px accent border + `accent08` bg.
  - **(only when Format === pptx)** "Layout fidelity" — radio list of two stacked cards: "Hybrid editable" (with `recommended` chip) and "Image only". Selected = 2px accent border + `accent08` bg + filled radio dot.
  - "Filename" — text input pre-filled `Series-B-Pitch-Sequoia.pptx`.
  - Inline summary callout (`accent08` bg, `accent40` border, 12px text): "Ready when you are. 6 slides · 16:9 · 4.2 MB estimated. Export takes about 8 seconds."
- **Footer** (14×26 padding, top border, `#faf8f4` bg): "Saved to your downloads folder." caption left; ghost "Cancel" + primary "Export PPTX" right.

**State:** `fmt: 'pptx' | 'pdf'`, `mode: 'hybrid' | 'image'`. Filename is uncontrolled in the prototype — wire it up.

**Interactions:**
- Switching to PDF hides the fidelity section.
- Cancel / X → close modal.
- Export → kick off real export job.

---

## Common patterns across screens

These appear repeatedly — implement them once as primitives:

### `AtelierTopbar` — present on Workspace, Generating, Export
- 12×24 padding, bottom border `#e8e1cf`, bg `#faf8f4`.
- **Left cluster:** optional back button (small ghost) → 22×22 accent dot → project name in Fraunces 16px (truncate) → optional status chip.
- **Right cluster:** optional Templates / Style / Discuss ghost buttons → primary Export → cost pill.

### Eyebrow label (`.atl-label`)
- 11px Inter 600, letter-spacing 0.1em, uppercase, color `#7a6f56`, 6px bottom margin. Used over every form section.

### Cost pill (`.atl-cost`)
- Always-visible "what is this run costing me" indicator. Also appears on Home as a static `$0.42` placeholder. In production, bind to running token spend.

### Outline row (`.atl-outline-row`)
- Used in Workspace and Generating. Same component, just different `status` content. Padding 12×14, gap 14, flex-start aligned. Hover tint `#ede5d2`. Active = white bg + 3px inset accent left edge.

### Card (`.atl-card`)
- White, 1px `#e8e1cf`, 10px radius. Wraps every panel-like surface.

### Tile (`.atl-card.atl-tile`)
- Card + hover lift (translateY(-3px), shadow-tile-hover). Used for project tiles, template tiles, gallery cards.

### Buttons
| Class | Style |
|---|---|
| `.atl-btn` | White bg, 1px `#d8d2c4` border, 13px Inter, 9×16 padding, 6px radius. Hover: bg `#f3efe5`, border accent. |
| `.atl-btn-pri` | Modifier — bg accent, off-white (`#faf8f4`) text, accent border. Hover: 0.92 opacity + soft accent shadow. |
| `.atl-btn-ghost` | Modifier — transparent bg + transparent border. Hover bg `#f3efe5`. |
| Tab (`.atl-tab`) | 8×0 padding, 12px Inter 500, `#7a6f56`, 2px transparent bottom border. `.on` = accent text + accent bottom border. |

### Inputs (`.atl-input`, `.atl-ta`)
- White bg, 1px `#e2dccd`, 6px radius, 10×12 padding, 13px Inter. Focus: accent border + 3px `accent20` ring. Textarea is line-height 1.55, vertical-resize.

### Chip (`.atl-chip`)
- `accent15` bg, accent text, 11px, 3×9 padding, 99px radius.

### Skeleton (`.atl-skel`)
- Linear-gradient shimmer between `#ede5d2` → `#f3efe5` → `#ede5d2`, animated 1.6s linear via `@keyframes atl-shimmer`.

---

## State Management

Prototype uses local `useState` per top-level screen and a router-style switch in `<AtelierProto>`:

```
view: 'home' | 'home-empty' | 'gallery' | 'generating' | 'workspace' | 'export'
activeProject: Project
```

In production, replace with whatever the codebase uses (Redux / Zustand / Context / TanStack Query / route-based).

**State the workspace owns:**
- `slides[]` — keyed by id; each editable.
- `activeIdx` — selection.
- `drawer: null | 'discuss' | 'style'` — UI mode.
- (Add) `chatHistory[]` per slide — Discuss drawer is per-slide.
- (Add) `style` — deck-level style settings (direction, avoid, aspect, template).

**Server state needed:**
- Project list + thumbnails for Home.
- Monthly cost total (Home) and live run cost (Generating, Workspace).
- Templates library (Gallery).
- Slide render jobs (Generating progress, "rendering" spinner).
- Auto-save signal (status chip in topbar).

---

## Interactions & Behavior — checklist

- [ ] All buttons have hover states (border tint to accent, bg shift).
- [ ] All cards lift on hover (where they're clickable — tiles).
- [ ] Inputs show 3px accent ring on focus.
- [ ] Outline rows highlight active and hovered states.
- [ ] Drawer is dismissible via header X **and** by clicking the same topbar button that opened it (toggle).
- [ ] Generating advances per real backend events; the prototype's 1100ms timer is a placeholder.
- [ ] Cost pill is always visible; updates as work happens.
- [ ] Auto-save status appears in topbar status chip ("draft · auto-saved" / "saving…" / "saved 2s ago").
- [ ] Speaker notes are collapsed by default (`<details>`), discoverable but not in the way.
- [ ] Modal: backdrop click + Escape close it.
- [ ] Keyboard nav through outline rows (↑/↓) is desirable but not in the prototype.

---

## Files

In `prototype/`:

| File | Role |
|---|---|
| `SlideBuilder UX Redesign.html` | Entry point. Loads React + Babel + the JSX files; wires up `<DesignCanvas>` shell with one `<DCArtboard>` per screen. |
| `proto-atelier.jsx` | All six screens + `AtelierTopbar` + `atlCSS()` (the inline stylesheet builder, parameterized by accent). **The main reference for implementation.** |
| `mock-data.jsx` | `SAMPLE_SLIDES`, `SAMPLE_PROJECTS`, `SAMPLE_TEMPLATES`, `SAMPLE_CHAT`, `<FauxSlide>` placeholder, `<Icon>` set (inlined SVGs — replace with the codebase's icon library, e.g. lucide-react). |
| `design-canvas.jsx` | The pan/zoom canvas chrome that arranges artboards in the prototype. **Not part of the product** — it's just the presentation shell for review. Skip in implementation. |
| `tweaks-panel.jsx` | Tweaks panel for live-tweaking the prototype. **Not part of the product.** Skip in implementation. |

To run the prototype locally: open `SlideBuilder UX Redesign.html` directly in a browser. No build step.

---

## Implementation order (suggested)

1. **Tokens first** — colors, type, spacing, radii, shadows. Wire `accent` as a CSS variable so theming works.
2. **Primitives** — `Button`, `Input`, `Textarea`, `Card`, `Chip`, `EyebrowLabel`, `CostPill`, `OutlineRow`, `Topbar`. Each has 1–2 variants.
3. **Workspace shell** — outline rail + stage + inspector. This is the most-used screen; nail it first.
4. **Drawer** (Discuss + Style) over the workspace.
5. **Home** (returning + empty).
6. **Template gallery**.
7. **Generating**.
8. **Export modal**.

---

## Notes on the AI surface

- **Concept** (slide-level prompt) drives the slide's image render. It's user-editable; persist as part of the slide record.
- **Discuss** is a per-slide chat. The chat agent has access to the slide's full state (title, subtitle, bullets, prompt, notes) and can edit any of them. Render assistant edits as suggestions the user can accept/reject (not in the current prototype — add).
- **Style** is deck-level. Applying changes re-renders all slide thumbnails — show a confirm step ("Apply to deck — this will regenerate 6 slides at ~$0.18").
- **Templates** can also be AI-generated from a description (the gallery sidebar). Treat that as creating a custom template that gets saved to the user's library.

---

## Open questions for the implementer / product

- Drag-to-reorder on outline rows — assumed but not designed. Sketch: drag handle appears on hover; row lifts; drop-zone indicator between rows.
- Multi-select in outline (delete N slides, regenerate batch) — not in current prototype.
- Versioning / history — not in current prototype.
- Collaboration — single-user assumed throughout.
- Settings / brand kit — not in current prototype.
- Mobile / tablet — desktop-only. Workspace at <1024px would need a different layout (drawer becomes bottom sheet, outline becomes a hamburger drawer).

If any of these are in scope, request a follow-up design pass before implementing.
