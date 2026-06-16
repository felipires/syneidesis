/* Server-side mirror of the data, in a real SQLite file (Bun's built-in engine).
   Two jobs:
     1. Sync target — receives the client's `pending` rows and reconciles them
        last-write-wins by `updatedAt`, and serves back anything newer.
     2. Source of truth for the PUBLIC read-only pages, which are server-rendered
        so a shared link works for anyone, even when the author is offline.

   `bun:sqlite` is a Bun runtime builtin; it is imported dynamically with a
   @vite-ignore so Vite never tries to bundle it. Runs under `bun run dev` and,
   for deploy, adapter-bun. */

import type { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { SCHEMA_SQL, type Article, type Container, type ArticleRef } from '$lib/db/schema';

const DB_DIR = '.data';
const DB_PATH = `${DB_DIR}/syneidesis-server.sqlite3`;

const EPOCH = '1970-01-01T00:00:00.000Z';

let dbPromise: Promise<Database> | null = null;

async function open(): Promise<Database> {
	const { Database } = await import(/* @vite-ignore */ 'bun:sqlite');
	mkdirSync(DB_DIR, { recursive: true });
	const db = new Database(DB_PATH, { create: true });
	db.exec('PRAGMA journal_mode = WAL;');
	for (const stmt of SCHEMA_SQL.split(';')) {
		const s = stmt.trim();
		if (s) db.run(s);
	}
	return db;
}

export function getServerDb(): Promise<Database> {
	if (!dbPromise) dbPromise = open();
	return dbPromise;
}

/* ----------------------------------------------------------------- Sync (LWW) */

type Row = Record<string, unknown> & { id: string; updatedAt: string };

const COLUMNS = {
	articles: [
		'id', 'title', 'body', 'visibility', 'publicSlug', 'entryDate',
		'homeContainerId', 'createdAt', 'updatedAt', 'deletedAt', 'syncState'
	],
	containers: [
		'id', 'type', 'title', 'description', 'visibility',
		'createdAt', 'updatedAt', 'deletedAt', 'syncState'
	],
	articleRefs: [
		'id', 'articleId', 'containerId', 'position',
		'createdAt', 'updatedAt', 'deletedAt', 'syncState'
	]
} as const;

type Table = keyof typeof COLUMNS;

/** Apply incoming rows last-write-wins: insert new, overwrite only if newer. */
function applyRows(db: Database, table: Table, rows: Row[]): void {
	if (!rows?.length) return;
	const cols = COLUMNS[table];
	const placeholders = cols.map((c) => `$${c}`).join(', ');
	const setClause = cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ');
	const sql = `
		INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})
		ON CONFLICT(id) DO UPDATE SET ${setClause}
		WHERE excluded.updatedAt > ${table}.updatedAt`;
	const stmt = db.query(sql);
	for (const row of rows) {
		const params: Record<string, unknown> = {};
		for (const c of cols) params[`$${c}`] = (row as Record<string, unknown>)[c] ?? null;
		stmt.run(params);
	}
}

/** Rows changed strictly after `since` — the client's pull. */
function changedSince(db: Database, table: Table, since: string): Row[] {
	return db.query<Row>(`SELECT * FROM ${table} WHERE updatedAt > ? ORDER BY updatedAt ASC`).all(since);
}

export interface SyncPayload {
	articles?: Article[];
	containers?: Container[];
	articleRefs?: ArticleRef[];
}

export interface SyncResult {
	now: string;
	articles: Article[];
	containers: Container[];
	articleRefs: ArticleRef[];
}

/** The whole exchange: ingest the client's changes, return what it's missing. */
export async function sync(since: string | undefined, changes: SyncPayload): Promise<SyncResult> {
	const db = await getServerDb();
	applyRows(db, 'articles', (changes.articles ?? []) as unknown as Row[]);
	applyRows(db, 'containers', (changes.containers ?? []) as unknown as Row[]);
	applyRows(db, 'articleRefs', (changes.articleRefs ?? []) as unknown as Row[]);

	const cursor = since ?? EPOCH;
	const now = new Date().toISOString();
	return {
		now,
		articles: changedSince(db, 'articles', cursor) as unknown as Article[],
		containers: changedSince(db, 'containers', cursor) as unknown as Container[],
		articleRefs: changedSince(db, 'articleRefs', cursor) as unknown as ArticleRef[]
	};
}

/* --------------------------------------------------------------- Public reads */

const ALIVE_PUBLIC = `deletedAt IS NULL AND visibility = 'public'`;

export async function getPublicArticleBySlug(slug: string): Promise<Article | null> {
	const db = await getServerDb();
	return db
		.query<Article>(`SELECT * FROM articles WHERE publicSlug = ? AND ${ALIVE_PUBLIC}`)
		.get(slug);
}

export async function getPublicContainer(id: string): Promise<Container | null> {
	const db = await getServerDb();
	return db.query<Container>(`SELECT * FROM containers WHERE id = ? AND ${ALIVE_PUBLIC}`).get(id);
}

/** Public articles homed in a journal, newest entry first. */
export async function listPublicJournalEntries(journalId: string): Promise<Article[]> {
	const db = await getServerDb();
	return db
		.query<Article>(
			`SELECT * FROM articles
			 WHERE homeContainerId = ? AND ${ALIVE_PUBLIC}
			 ORDER BY COALESCE(entryDate, substr(createdAt,1,10)) DESC, createdAt DESC`
		)
		.all(journalId);
}

/** Public articles referenced into a collection, in manual order. */
export async function listPublicCollectionArticles(containerId: string): Promise<Article[]> {
	const db = await getServerDb();
	return db
		.query<Article>(
			`SELECT a.* FROM articleRefs r
			 JOIN articles a ON a.id = r.articleId AND a.deletedAt IS NULL AND a.visibility = 'public'
			 WHERE r.containerId = ? AND r.deletedAt IS NULL
			 ORDER BY r.position ASC`
		)
		.all(containerId);
}

export interface PublicIndex {
	containers: Container[];
	articles: Article[];
}

/** The public landing: every public container + every public loose article. */
export async function listPublicIndex(): Promise<PublicIndex> {
	const db = await getServerDb();
	const containers = db
		.query<Container>(`SELECT * FROM containers WHERE ${ALIVE_PUBLIC} ORDER BY createdAt DESC`)
		.all();
	const articles = db
		.query<Article>(
			`SELECT * FROM articles WHERE homeContainerId IS NULL AND ${ALIVE_PUBLIC} ORDER BY updatedAt DESC`
		)
		.all();
	return { containers, articles };
}
