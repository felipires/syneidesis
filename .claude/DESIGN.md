# Design

> Visual system for **Syneidesis**. Direction: **Ink & Light** — a calm page that
> glows; warm light gathers as you write. Day = paper, Night = lamplight.
> Register: product. See [PRODUCT.md](PRODUCT.md) for strategy.

## Theme

A writing-first interface where chrome recedes and words lead. Two moods of the same
soul, user-switchable (and following `prefers-color-scheme` by default):

- **Day — Paper:** pure-white page, deep indigo ink, a quiet warm spark of "light."
- **Night — Lamplight:** deep ink-blue room where the page itself glows; warm
  candle-light accents. For late, intimate writing.

The brand color is a considered **indigo** (blueprint ink on a clean page). Warmth is
carried by a single **amber "light"** accent and by typography — never by tinting the
paper itself. Color strategy: **Restrained** (tinted-neutral surfaces + one accent).

## Color

OKLCH throughout. Tokens are defined per mode; component code references role names,
never raw values.

### Day (Paper) — default light
```css
--bg:        oklch(1 0 0);          /* pure white paper */
--surface:   oklch(0.975 0.004 255);/* panels, raised areas */
--ink:       oklch(0.25 0.02 255);  /* body text — ~13:1 on bg */
--muted:     oklch(0.52 0.02 255);  /* secondary text/labels — ~4.8:1 */
--hairline:  oklch(0.92 0.004 255); /* 1px rules, dividers */
--primary:   oklch(0.40 0.11 255);  /* indigo — links, today, selection */
--primary-ink: oklch(1 0 0);        /* text on filled primary */
--accent:    oklch(0.72 0.14 70);   /* amber "light" — caret glow, today mark */
--accent-soft: oklch(0.72 0.14 70 / 0.14); /* the gathered-light wash */
--danger:    oklch(0.52 0.16 25);   /* destructive only */
```

### Night (Lamplight) — dark
```css
--bg:        oklch(0.16 0.015 260); /* deep ink-blue room */
--surface:   oklch(0.205 0.018 260);
--ink:       oklch(0.90 0.008 250); /* body text — high contrast on bg */
--muted:     oklch(0.66 0.012 250); /* secondary text */
--hairline:  oklch(0.28 0.015 260);
--primary:   oklch(0.72 0.11 255);  /* lightened indigo for links on dark */
--primary-ink: oklch(0.16 0.015 260);
--accent:    oklch(0.80 0.12 70);   /* warm candle glow */
--accent-soft: oklch(0.80 0.12 70 / 0.16);
--danger:    oklch(0.70 0.14 25);
```

**Rules:** body text ≥4.5:1 (these clear 7:1); `--muted` ≥3.5:1; the amber accent is
for *light*, not decoration — caret glow, the "today" mark, focus rings, link
underlines on hover. Text on a filled accent uses white (Helmholtz-Kohlrausch).
No gradient text, no glass, no side-stripe borders.

## Typography

Contrast-axis pairing: **serif for reading, mono for meta** (annotations feel).

- **Reading / editor — serif:** `Spectral` (fallback `Newsreader`, `Georgia`, serif).
  Screen-tuned, calm, excellent for long-form. Carries entry body and titles.
- **Meta / UI — mono:** `IBM Plex Mono` (fallback `ui-monospace`, `SFMono`,
  monospace). Used for dates, labels, word-count, nav — small, quiet, ink-annotation
  character.

### Scale (fixed rem; product register, ratio ~1.2)
| Role | Size / line-height | Family |
|---|---|---|
| Entry body (editor) | 1.1875rem / 1.72 | serif |
| Entry title | 2rem / 1.2, weight 500 | serif |
| Section heading | 1.25rem / 1.3 | serif |
| UI label / date / meta | 0.8125rem / 1.4, tracking 0.02em | mono |
| Caption / word-count | 0.75rem / 1.4 | mono |

- Reading **measure capped at 66ch**; `text-wrap: pretty` on prose, `balance` on titles.
- Markdown affordances (`#`, `*`, `>`) render to rich text live (Milkdown).

## Spacing & Layout

- 4px base scale: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- **The page breathes.** The editor centers a single ~66ch column in a wide, empty
  field; vertical rhythm is generous, never dense.
- App shell is **near-chromeless**: a thin top bar (title + mode + a single quiet
  action) that fully **hides in Zen mode**. No persistent sidebar; navigation is a
  calm overlay, summoned, not always-present.
- Responsive is structural: the centered measure holds on desktop; on mobile the
  column is full-width with comfortable gutters. Flexbox for 1D, Grid only where 2D.

## Shape & Elevation

- Radii: 6px (controls), 10px (panels/overlays). Nothing pill-shaped or bubbly.
- Elevation is **light, not shadow**: raised surfaces read via the faint `--surface`
  step and a hairline, plus (sparingly) a soft warm `--accent-soft` halo on the
  active writing area. Avoid heavy drop shadows.
- z-index scale (semantic): dropdown → sticky → overlay-backdrop → overlay → toast.

## Motion

Intentional and quiet. Ease-out only (`cubic-bezier(0.16,1,0.3,1)`, expo-ish).

- UI transitions 150–220ms (mode toggle, overlay in/out, save state).
- **Signature — "light emerges"** (the soul of the direction):
  1. **Current-line glow:** the line under the caret carries a faint `--accent-soft`
     underglow that softly tracks as you type.
  2. **Gathering light:** a thin vertical rule in the left margin of an entry warms
     (transparent → `--accent-soft`) as the entry grows in length — your words
     literally accrue light.
  3. **Save pulse:** on autosave, a single small amber dot breathes once (the only
     "saved" signal — no toasts).
- **Zen focus:** non-current paragraphs dim to `--muted` opacity; the paragraph
  you're in stays full-ink (iA-style focus), fading gently on caret move.
- **Reduced motion:** every effect degrades to a *static* state — current line gets a
  constant subtle warm tint, the margin rule shows final warmth instantly, the save
  dot appears without breathing. Nothing animates. (`prefers-reduced-motion: reduce`.)

## Components

Minimal vocabulary, consistent across app and public reader.

- **Writing surface:** borderless, full-ink serif, centered measure, current-line
  glow + focus dimming. This is the hero; it must feel like an empty, inviting page.
- **Top bar (hideable):** mono title · mode toggle (sun/moon) · one contextual action
  (e.g. "Done"). Vanishes in Zen.
- **Buttons:** text-first and quiet; primary = filled indigo with white text, used
  rarely (one clear action per moment). Ghost/text buttons for the rest. Full states:
  default / hover / focus (amber ring) / active / disabled / loading / error.
- **Journal timeline:** newest-first list of dated entries; date in mono, first line
  in serif; the **today** entry marked with the amber light dot.
- **Collection view:** ordered, drag-reorderable list of article references.
- **Visibility control:** a quiet private↔public toggle; when public, reveals the
  shareable link inline (no modal-first).
- **Empty states teach, not apologize:** e.g. a journal's first day invites
  "Write today's entry," not "Nothing here."
- **Public reader:** the writing surface stripped of all editor affordances —
  pure reading, same type and light. **Public index** lists public writing calmly.
- Skeleton (not spinners) for any load; offline/sync state shown as a tiny quiet
  mono indicator, never alarming.

## Accessibility & Inclusion

- WCAG **AA**: contrasts above meet it (body ≥7:1); placeholder text uses `--muted`,
  not lighter. Large text ≥3:1.
- Full keyboard operation; visible **amber focus ring** on every interactive element.
- `prefers-reduced-motion` honored on all motion (see Motion).
- `prefers-color-scheme` sets the default mode; user override persists.
- Long-form legibility is first-class: 66ch measure, 1.72 line-height, comfortable
  serif size, and a future text-size control.
