/* The local database: SQLite in the browser via SQLocal, persisted to
   localStorage (SQLocal's kvvfs driver, selected by databasePath = 'local').

   Why localStorage and not OPFS: OPFS persistence relies on the sqlite-wasm
   async-proxy worker + SharedArrayBuffer (and so cross-origin isolation). In
   production that path deadlocked on init ("syncing… forever"). The kvvfs/
   'local' driver runs on the main thread with no worker, no SharedArrayBuffer
   and no COOP/COEP — robust across every browser (incl. incognito). Plenty for
   a personal text journal (~5 MB); revisit OPFS if we ever outgrow it.

   This file is the ONLY place that constructs the engine. It is browser-only,
   lazily created on first use, and self-migrating. The repo layer (repo.ts)
   talks to it; UI never imports it directly. */

import { browser } from '$app/environment';
import { SQLocal } from 'sqlocal';
import { SCHEMA_SQL } from './schema';

// 'local' → SQLocal kvvfs driver, persisted to localStorage on the main thread.
export const DB_FILE = 'local';

let ready: Promise<SQLocal> | null = null;

async function create(): Promise<SQLocal> {
	if (!browser) throw new Error('The local database is only available in the browser.');

	const db = new SQLocal(DB_FILE);

	// Run the DDL one statement at a time. Passing a single-element string array
	// to the tagged-template `sql` executes the raw statement with no params.
	const exec = (raw: string) => db.sql([raw] as unknown as TemplateStringsArray);
	for (const stmt of SCHEMA_SQL.split(';')) {
		const s = stmt.trim();
		if (s) await exec(s);
	}

	return db;
}

/** Resolve the migrated DB instance, creating it once on first call. */
export function getDb(): Promise<SQLocal> {
	if (!ready) ready = create();
	return ready;
}
