/* Shared domain types + the local SQLite schema (OPFS, via SQLocal).
   One content primitive (Article) viewed through Container "lenses" (journal /
   collection). Columns are camelCase so query rows map straight to these types.
   Every record carries `updatedAt` + `syncState` to drive the hand-rolled sync,
   and `deletedAt` for soft-deletes (so deletions can propagate). See DESIGN.md /
   the requirements plan for the model. */

export type Visibility = 'private' | 'public';
export type SyncState = 'pending' | 'synced';
export type ContainerType = 'journal' | 'collection';

export interface Article {
	id: string;
	title: string;
	/** Markdown source — the editor's source of truth. */
	body: string;
	visibility: Visibility;
	/** Stable shareable slug; only meaningful when public. Null until first shared. */
	publicSlug: string | null;
	/** `YYYY-MM-DD` the entry is *about* (set for journal entries), else null. */
	entryDate: string | null;
	/** The one container it belongs to; null for a loose standalone article. */
	homeContainerId: string | null;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	syncState: SyncState;
}

export interface Container {
	id: string;
	type: ContainerType;
	title: string;
	description: string;
	visibility: Visibility;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	syncState: SyncState;
}

/** Links an article into a container that is NOT its home (featured/referenced). */
export interface ArticleRef {
	id: string;
	articleId: string;
	containerId: string;
	/** Fractional rank for manual ordering within a collection. */
	position: number;
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	syncState: SyncState;
}

/** DDL applied on first run. Idempotent — safe to run every boot. */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS articles (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  visibility      TEXT NOT NULL DEFAULT 'private',
  publicSlug      TEXT,
  entryDate       TEXT,
  homeContainerId TEXT,
  createdAt       TEXT NOT NULL,
  updatedAt       TEXT NOT NULL,
  deletedAt       TEXT,
  syncState       TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_articles_home   ON articles (homeContainerId);
CREATE INDEX IF NOT EXISTS idx_articles_entry  ON articles (entryDate);
CREATE INDEX IF NOT EXISTS idx_articles_sync   ON articles (syncState);
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON articles (publicSlug) WHERE publicSlug IS NOT NULL;

CREATE TABLE IF NOT EXISTS containers (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  visibility  TEXT NOT NULL DEFAULT 'private',
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL,
  deletedAt   TEXT,
  syncState   TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_containers_type ON containers (type);
CREATE INDEX IF NOT EXISTS idx_containers_sync ON containers (syncState);

CREATE TABLE IF NOT EXISTS articleRefs (
  id          TEXT PRIMARY KEY,
  articleId   TEXT NOT NULL,
  containerId TEXT NOT NULL,
  position    REAL NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL,
  deletedAt   TEXT,
  syncState   TEXT NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_refs_container ON articleRefs (containerId);
CREATE INDEX IF NOT EXISTS idx_refs_article   ON articleRefs (articleId);
CREATE INDEX IF NOT EXISTS idx_refs_sync      ON articleRefs (syncState);
`;
