# Syneidesis

A quiet, offline-first place to write and reflect — a personal journal + articles
web app. The whole thing is built to feel like fine paper and ink: the writing is
the interface, and the app recedes around it.

> _Every concept is a small universe — an assumption and a world that took time to
> grasp, until one day it feels obvious. Syneidesis is a space to externalize
> thoughts and honor that act of discovery, the small light that arrives when you
> get an idea out of your head and onto the page._

## What it does

- **Write** in a minimal, distraction-free editor — live markdown that renders as
  you type (WYSIWYG), with a **Zen mode** that dims everything but the line you're on.
- **Journals** — dated streams you return to. "Write today's entry" opens a new entry
  titled with the day.
- **Collections** — gather standalone pieces into a deliberate order.
- **Loose articles** — standalone writing with no home.
- **Share** any piece (or a whole journal/collection) read-only via a public link.
- **Offline-first** — everything works with no connection; the local copy is always
  the source of truth, and changes sync up when you're back online.

## The "Ink & Light" design

Two moods of one calm system, following your OS or toggled by hand:

- **Day — paper:** pure-white page, deep indigo ink, a warm amber spark.
- **Night — lamplight:** a deep ink-blue room where the page glows.

A signature touch — _light gathers as you write_: the current line carries a soft warm
glow. Typography is serif for reading, mono for metadata. See
[`DESIGN.md`](.claude/DESIGN.md) and [`PRODUCT.md`](.claude/PRODUCT.md) for the full system and the
product brief.

## Stack

| Concern           | Choice                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- |
| Framework         | SvelteKit + Svelte 5 (runes), TypeScript                                              |
| Runtime / tooling | [Bun](https://bun.sh)                                                                 |
| Editor            | [Milkdown](https://milkdown.dev) (markdown WYSIWYG)                                   |
| Local storage     | SQLite in the browser via OPFS ([SQLocal](https://sqlocal.dev)) — the source of truth |
| Server storage    | SQLite (`bun:sqlite`)                                                                 |
| Sync              | Hand-rolled — no sync library; per-row `pending`/`synced` + last-write-wins           |
| Styling           | Vanilla CSS + OKLCH design tokens (no framework)                                      |

Storage is **SQLite on both sides**, with a small hand-written sync engine: every
local write is marked `pending`; when online it's pushed to the server, then anything
newer is pulled back. Conflicts resolve last-write-wins by timestamp (safe for a single
author across devices).

## Getting started

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev          # http://localhost:5173
```

> **Note:** the dev/preview scripts run Vite under the Bun runtime
> (`bun --bun vite dev`) so the server can use Bun's built-in `bun:sqlite`. Running
> plain `vite dev` (Node) will break the sync endpoint.

```sh
bun run check        # type-check
bun run build        # production build
bun run preview      # preview the build (also under Bun)
```

## Project structure

```
src/
  lib/
    db/          local OPFS SQLite — schema, client, repository (CRUD)
    sync/        the hand-rolled sync engine
    server/      server-side SQLite (bun:sqlite) + public read queries
    components/  Editor, TopBar, VisibilityToggle
    styles/      design tokens (OKLCH, day/night)
    theme.svelte.ts, ui.svelte.ts
  routes/
    +page.svelte           home hub (journals / collections / loose writing)
    write/                 the editor (autosaves to local SQLite)
    journal/[id]/          a journal timeline
    collection/[id]/       an ordered collection
    api/sync/              the sync endpoint
    read/                  public, server-rendered, read-only
```

## Status & roadmap

v0 is functional locally. Before any public deployment:

- **Auth** — the sync endpoint is currently unauthenticated (safe only on
  localhost / single user). It needs the single-user session gate.
- **Adapter** — swap `adapter-auto` for `adapter-bun` (or a Bun host) so production
  runs under Bun.
- **PWA** — add a service worker for true offline app-shell caching (manifest + icon
  are in place).

## License

Personal project. All rights reserved (for now).
