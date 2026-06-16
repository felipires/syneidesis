/* The local database: SQLite living in the browser's OPFS via SQLocal.
   This file is the ONLY place that constructs the engine. It is strictly
   browser-only (SQLocal spins up a Worker), lazily created on first use, and
   self-migrating. The repo layer (repo.ts) talks to it; UI never imports it
   directly. */

import { browser } from '$app/environment';
import { SQLocal } from 'sqlocal';
import { SCHEMA_SQL } from './schema';

export const DB_FILE = 'syneidesis.sqlite3';

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
