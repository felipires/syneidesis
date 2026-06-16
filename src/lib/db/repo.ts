/* Repository: the only API the app uses to read/write local data.
   Invariants enforced here so the rest of the app can't get them wrong:
     - every mutation stamps `updatedAt = now()` and `syncState = 'pending'`
     - deletes are soft (`deletedAt` set); reads exclude soft-deleted rows
     - the local DB is always the source of truth (offline-first)
   Updates use read-merge-write: simplest correct path for a single author. */

import { getDb } from './client';
import type {
	Article,
	Container,
	ArticleRef,
	ContainerType,
	Visibility
} from './schema';
import { newId, now, slugify, today } from '../util/id';
import { formatLong } from '../util/format';

// NOTE: SQLocal's `sql` tagged template parameterizes every `${}`, so SQL
// fragments (like "deletedAt IS NULL") must be written literally in each query,
// never interpolated — interpolation would bind them as values.

/* ----------------------------------------------------------------- Containers */

export async function listContainers(type?: ContainerType): Promise<Container[]> {
	const db = await getDb();
	const rows = type
		? await db.sql`SELECT * FROM containers WHERE type = ${type} AND deletedAt IS NULL ORDER BY createdAt DESC`
		: await db.sql`SELECT * FROM containers WHERE deletedAt IS NULL ORDER BY createdAt DESC`;
	return rows as Container[];
}

export async function getContainer(id: string): Promise<Container | null> {
	const db = await getDb();
	const rows = (await db.sql`SELECT * FROM containers WHERE id = ${id} AND deletedAt IS NULL`) as Container[];
	return rows[0] ?? null;
}

export async function createContainer(input: {
	type: ContainerType;
	title?: string;
	description?: string;
	visibility?: Visibility;
}): Promise<Container> {
	const db = await getDb();
	const ts = now();
	const c: Container = {
		id: newId(),
		type: input.type,
		title: input.title ?? '',
		description: input.description ?? '',
		visibility: input.visibility ?? 'private',
		createdAt: ts,
		updatedAt: ts,
		deletedAt: null,
		syncState: 'pending'
	};
	await db.sql`
		INSERT INTO containers (id, type, title, description, visibility, createdAt, updatedAt, deletedAt, syncState)
		VALUES (${c.id}, ${c.type}, ${c.title}, ${c.description}, ${c.visibility}, ${c.createdAt}, ${c.updatedAt}, ${c.deletedAt}, ${c.syncState})`;
	return c;
}

export async function updateContainer(
	id: string,
	patch: Partial<Pick<Container, 'title' | 'description' | 'visibility'>>
): Promise<Container | null> {
	const existing = await getContainer(id);
	if (!existing) return null;
	const next: Container = {
		...existing,
		...patch,
		updatedAt: now(),
		syncState: 'pending'
	};
	const db = await getDb();
	await db.sql`
		UPDATE containers
		SET title = ${next.title}, description = ${next.description}, visibility = ${next.visibility},
		    updatedAt = ${next.updatedAt}, syncState = ${next.syncState}
		WHERE id = ${id}`;
	return next;
}

export async function deleteContainer(id: string): Promise<void> {
	const db = await getDb();
	const ts = now();
	// Soft-delete the container; detach its articles to loose (homeContainerId = null).
	await db.sql`UPDATE containers SET deletedAt = ${ts}, updatedAt = ${ts}, syncState = 'pending' WHERE id = ${id}`;
	await db.sql`UPDATE articles SET homeContainerId = NULL, updatedAt = ${ts}, syncState = 'pending' WHERE homeContainerId = ${id} AND deletedAt IS NULL`;
	await db.sql`UPDATE articleRefs SET deletedAt = ${ts}, updatedAt = ${ts}, syncState = 'pending' WHERE containerId = ${id} AND deletedAt IS NULL`;
}

/* ------------------------------------------------------------------- Articles */

export async function getArticle(id: string): Promise<Article | null> {
	const db = await getDb();
	const rows = (await db.sql`SELECT * FROM articles WHERE id = ${id} AND deletedAt IS NULL`) as Article[];
	return rows[0] ?? null;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
	const db = await getDb();
	const rows = (await db.sql`
		SELECT * FROM articles WHERE publicSlug = ${slug} AND visibility = 'public' AND deletedAt IS NULL`) as Article[];
	return rows[0] ?? null;
}

/** Loose articles (no home container), newest first. */
export async function listLooseArticles(): Promise<Article[]> {
	const db = await getDb();
	return (await db.sql`
		SELECT * FROM articles WHERE homeContainerId IS NULL AND deletedAt IS NULL ORDER BY updatedAt DESC`) as Article[];
}

/** A journal's entries as a timeline — by entryDate (newest first), then recency. */
export async function listJournalEntries(journalId: string): Promise<Article[]> {
	const db = await getDb();
	return (await db.sql`
		SELECT * FROM articles
		WHERE homeContainerId = ${journalId} AND deletedAt IS NULL
		ORDER BY COALESCE(entryDate, substr(createdAt, 1, 10)) DESC, createdAt DESC`) as Article[];
}

export async function createArticle(input: {
	title?: string;
	body?: string;
	visibility?: Visibility;
	entryDate?: string | null;
	homeContainerId?: string | null;
}): Promise<Article> {
	const db = await getDb();
	const ts = now();
	const a: Article = {
		id: newId(),
		title: input.title ?? '',
		body: input.body ?? '',
		visibility: input.visibility ?? 'private',
		publicSlug: null,
		entryDate: input.entryDate ?? null,
		homeContainerId: input.homeContainerId ?? null,
		createdAt: ts,
		updatedAt: ts,
		deletedAt: null,
		syncState: 'pending'
	};
	await db.sql`
		INSERT INTO articles (id, title, body, visibility, publicSlug, entryDate, homeContainerId, createdAt, updatedAt, deletedAt, syncState)
		VALUES (${a.id}, ${a.title}, ${a.body}, ${a.visibility}, ${a.publicSlug}, ${a.entryDate}, ${a.homeContainerId}, ${a.createdAt}, ${a.updatedAt}, ${a.deletedAt}, ${a.syncState})`;
	return a;
}

export async function updateArticle(
	id: string,
	patch: Partial<Pick<Article, 'title' | 'body' | 'visibility' | 'entryDate' | 'homeContainerId'>>
): Promise<Article | null> {
	const existing = await getArticle(id);
	if (!existing) return null;

	const next: Article = { ...existing, ...patch, updatedAt: now(), syncState: 'pending' };

	// Going public mints a stable slug once; going private keeps it (so links can
	// be re-shared) but the public views gate on visibility anyway.
	if (next.visibility === 'public' && !next.publicSlug) {
		next.publicSlug = slugify(next.title || 'entry');
	}

	const db = await getDb();
	await db.sql`
		UPDATE articles
		SET title = ${next.title}, body = ${next.body}, visibility = ${next.visibility},
		    publicSlug = ${next.publicSlug}, entryDate = ${next.entryDate},
		    homeContainerId = ${next.homeContainerId},
		    updatedAt = ${next.updatedAt}, syncState = ${next.syncState}
		WHERE id = ${id}`;
	return next;
}

export async function deleteArticle(id: string): Promise<void> {
	const db = await getDb();
	const ts = now();
	await db.sql`UPDATE articles SET deletedAt = ${ts}, updatedAt = ${ts}, syncState = 'pending' WHERE id = ${id}`;
	await db.sql`UPDATE articleRefs SET deletedAt = ${ts}, updatedAt = ${ts}, syncState = 'pending' WHERE articleId = ${id} AND deletedAt IS NULL`;
}

/** Fast path for "write today's entry": reuse today's entry in a journal or make one. */
export async function getOrCreateTodayEntry(journalId: string): Promise<Article> {
	const db = await getDb();
	const t = today();
	const rows = (await db.sql`
		SELECT * FROM articles
		WHERE homeContainerId = ${journalId} AND entryDate = ${t} AND deletedAt IS NULL
		ORDER BY createdAt DESC LIMIT 1`) as Article[];
	// A new journal entry opens with the day as its title (e.g. "Monday, 15 June 2026").
	return (
		rows[0] ??
		(await createArticle({
			homeContainerId: journalId,
			entryDate: t,
			title: formatLong(now())
		}))
	);
}

/** Every alive article (for pickers, library views). Newest first. */
export async function listAllArticles(): Promise<Article[]> {
	const db = await getDb();
	return (await db.sql`SELECT * FROM articles WHERE deletedAt IS NULL ORDER BY updatedAt DESC`) as Article[];
}

/* --------------------------------------------------------------- Collection refs */

/** An article as it appears inside a collection: its fields + the ref id/position. */
export interface CollectionEntry extends Article {
	refId: string;
	position: number;
}

/** Articles referenced into a collection, in manual order. */
export async function listCollectionArticles(containerId: string): Promise<Article[]> {
	const db = await getDb();
	return (await db.sql`
		SELECT a.* FROM articleRefs r
		JOIN articles a ON a.id = r.articleId AND a.deletedAt IS NULL
		WHERE r.containerId = ${containerId} AND r.deletedAt IS NULL
		ORDER BY r.position ASC`) as Article[];
}

/** Same, but carrying ref metadata so the UI can reorder / remove. */
export async function listCollectionEntries(containerId: string): Promise<CollectionEntry[]> {
	const db = await getDb();
	return (await db.sql`
		SELECT a.*, r.id AS refId, r.position AS position FROM articleRefs r
		JOIN articles a ON a.id = r.articleId AND a.deletedAt IS NULL
		WHERE r.containerId = ${containerId} AND r.deletedAt IS NULL
		ORDER BY r.position ASC`) as CollectionEntry[];
}

export async function removeRef(refId: string): Promise<void> {
	const db = await getDb();
	const ts = now();
	await db.sql`UPDATE articleRefs SET deletedAt = ${ts}, updatedAt = ${ts}, syncState = 'pending' WHERE id = ${refId}`;
}

/** Persist a new manual order by assigning sequential positions to the given refs. */
export async function reorderRefs(orderedRefIds: string[]): Promise<void> {
	const db = await getDb();
	const ts = now();
	for (let i = 0; i < orderedRefIds.length; i++) {
		await db.sql`UPDATE articleRefs SET position = ${i + 1}, updatedAt = ${ts}, syncState = 'pending' WHERE id = ${orderedRefIds[i]}`;
	}
}

export async function addArticleToCollection(
	containerId: string,
	articleId: string
): Promise<ArticleRef> {
	const db = await getDb();
	const ts = now();
	const maxRows = (await db.sql`
		SELECT COALESCE(MAX(position), 0) AS maxPos FROM articleRefs
		WHERE containerId = ${containerId} AND deletedAt IS NULL`) as { maxPos: number }[];
	const ref: ArticleRef = {
		id: newId(),
		articleId,
		containerId,
		position: (maxRows[0]?.maxPos ?? 0) + 1,
		createdAt: ts,
		updatedAt: ts,
		deletedAt: null,
		syncState: 'pending'
	};
	await db.sql`
		INSERT INTO articleRefs (id, articleId, containerId, position, createdAt, updatedAt, deletedAt, syncState)
		VALUES (${ref.id}, ${ref.articleId}, ${ref.containerId}, ${ref.position}, ${ref.createdAt}, ${ref.updatedAt}, ${ref.deletedAt}, ${ref.syncState})`;
	return ref;
}

export async function reorderRef(refId: string, position: number): Promise<void> {
	const db = await getDb();
	await db.sql`UPDATE articleRefs SET position = ${position}, updatedAt = ${now()}, syncState = 'pending' WHERE id = ${refId}`;
}
