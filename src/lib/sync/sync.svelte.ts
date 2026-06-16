/* The hand-rolled sync engine (no external sync library).

   Model: the local OPFS database is always the source of truth. Every local write
   is marked `syncState='pending'`. This engine, when online, pushes pending rows to
   the server and — only once the server accepts them — flips them to `synced`, then
   pulls anything the server has that's newer than our cursor. Conflicts resolve
   last-write-wins by `updatedAt` (safe: single author).

   It never blocks writing; if offline or the request fails, rows simply stay
   `pending` and go up on the next successful run. */

import { browser } from '$app/environment';
import { getDb } from '$lib/db/client';
import type { Article, Container, ArticleRef } from '$lib/db/schema';

const CURSOR_KEY = 'syn-sync-cursor';
const INTERVAL_MS = 12_000;

type Status = 'idle' | 'syncing' | 'offline' | 'error';

interface ServerResult {
	now: string;
	articles: Article[];
	containers: Container[];
	articleRefs: ArticleRef[];
}

class SyncEngine {
	status = $state<Status>('idle');
	lastSyncedAt = $state<string | null>(null);

	#timer: ReturnType<typeof setInterval> | undefined;
	#nudge: ReturnType<typeof setTimeout> | undefined;
	#running = false;

	/** Wire up the background cadence: on load, on reconnect, and on an interval. */
	start() {
		if (!browser) return;
		this.run();
		window.addEventListener('online', () => this.run());
		window.addEventListener('offline', () => (this.status = 'offline'));
		this.#timer = setInterval(() => this.run(), INTERVAL_MS);
	}

	stop() {
		clearInterval(this.#timer);
	}

	/** Ask for a sync shortly after an edit (debounced), without spamming. */
	nudge() {
		clearTimeout(this.#nudge);
		this.#nudge = setTimeout(() => this.run(), 1500);
	}

	async run() {
		if (!browser || this.#running) return;
		if (!navigator.onLine) {
			this.status = 'offline';
			return;
		}
		this.#running = true;
		this.status = 'syncing';
		try {
			const db = await getDb();

			const articles = (await db.sql`SELECT * FROM articles WHERE syncState = 'pending'`) as Article[];
			const containers = (await db.sql`SELECT * FROM containers WHERE syncState = 'pending'`) as Container[];
			const articleRefs = (await db.sql`SELECT * FROM articleRefs WHERE syncState = 'pending'`) as ArticleRef[];

			const since = localStorage.getItem(CURSOR_KEY) ?? undefined;
			const res = await fetch('/api/sync', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ since, changes: { articles, containers, articleRefs } })
			});
			if (!res.ok) throw new Error(`sync ${res.status}`);
			const data = (await res.json()) as ServerResult;

			// Mark what we pushed as synced (only if it wasn't edited again meanwhile).
			for (const a of articles) await this.#markSynced(db, 'articles', a.id, a.updatedAt);
			for (const c of containers) await this.#markSynced(db, 'containers', c.id, c.updatedAt);
			for (const r of articleRefs) await this.#markSynced(db, 'articleRefs', r.id, r.updatedAt);

			// Apply server changes (LWW, never clobbering a newer local edit).
			for (const a of data.articles) await this.#applyArticle(db, a);
			for (const c of data.containers) await this.#applyContainer(db, c);
			for (const r of data.articleRefs) await this.#applyRef(db, r);

			localStorage.setItem(CURSOR_KEY, data.now);
			this.lastSyncedAt = data.now;
			this.status = 'idle';
		} catch {
			this.status = navigator.onLine ? 'error' : 'offline';
		} finally {
			this.#running = false;
		}
	}

	async #markSynced(
		db: Awaited<ReturnType<typeof getDb>>,
		table: 'articles' | 'containers' | 'articleRefs',
		id: string,
		updatedAt: string
	) {
		const stmt =
			table === 'articles'
				? db.sql`UPDATE articles SET syncState = 'synced' WHERE id = ${id} AND updatedAt = ${updatedAt} AND syncState = 'pending'`
				: table === 'containers'
					? db.sql`UPDATE containers SET syncState = 'synced' WHERE id = ${id} AND updatedAt = ${updatedAt} AND syncState = 'pending'`
					: db.sql`UPDATE articleRefs SET syncState = 'synced' WHERE id = ${id} AND updatedAt = ${updatedAt} AND syncState = 'pending'`;
		await stmt;
	}

	async #applyArticle(db: Awaited<ReturnType<typeof getDb>>, a: Article) {
		await db.sql`
			INSERT INTO articles (id, title, body, visibility, publicSlug, entryDate, homeContainerId, createdAt, updatedAt, deletedAt, syncState)
			VALUES (${a.id}, ${a.title}, ${a.body}, ${a.visibility}, ${a.publicSlug}, ${a.entryDate}, ${a.homeContainerId}, ${a.createdAt}, ${a.updatedAt}, ${a.deletedAt}, 'synced')
			ON CONFLICT(id) DO UPDATE SET
				title = excluded.title, body = excluded.body, visibility = excluded.visibility,
				publicSlug = excluded.publicSlug, entryDate = excluded.entryDate,
				homeContainerId = excluded.homeContainerId, createdAt = excluded.createdAt,
				updatedAt = excluded.updatedAt, deletedAt = excluded.deletedAt, syncState = 'synced'
			WHERE excluded.updatedAt > articles.updatedAt`;
	}

	async #applyContainer(db: Awaited<ReturnType<typeof getDb>>, c: Container) {
		await db.sql`
			INSERT INTO containers (id, type, title, description, visibility, createdAt, updatedAt, deletedAt, syncState)
			VALUES (${c.id}, ${c.type}, ${c.title}, ${c.description}, ${c.visibility}, ${c.createdAt}, ${c.updatedAt}, ${c.deletedAt}, 'synced')
			ON CONFLICT(id) DO UPDATE SET
				type = excluded.type, title = excluded.title, description = excluded.description,
				visibility = excluded.visibility, createdAt = excluded.createdAt,
				updatedAt = excluded.updatedAt, deletedAt = excluded.deletedAt, syncState = 'synced'
			WHERE excluded.updatedAt > containers.updatedAt`;
	}

	async #applyRef(db: Awaited<ReturnType<typeof getDb>>, r: ArticleRef) {
		await db.sql`
			INSERT INTO articleRefs (id, articleId, containerId, position, createdAt, updatedAt, deletedAt, syncState)
			VALUES (${r.id}, ${r.articleId}, ${r.containerId}, ${r.position}, ${r.createdAt}, ${r.updatedAt}, ${r.deletedAt}, 'synced')
			ON CONFLICT(id) DO UPDATE SET
				articleId = excluded.articleId, containerId = excluded.containerId, position = excluded.position,
				createdAt = excluded.createdAt, updatedAt = excluded.updatedAt,
				deletedAt = excluded.deletedAt, syncState = 'synced'
			WHERE excluded.updatedAt > articleRefs.updatedAt`;
	}
}

export const sync = new SyncEngine();
