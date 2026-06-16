/** Stable, collision-resistant id for local records (also used server-side). */
export function newId(): string {
	return crypto.randomUUID();
}

/** Current instant as an ISO-8601 string — the canonical `updatedAt`/`createdAt`. */
export function now(): string {
	return new Date().toISOString();
}

/** Today's date as `YYYY-MM-DD`, in the user's local timezone (journal entryDate). */
export function today(): string {
	const d = new Date();
	const tz = d.getTimezoneOffset() * 60000;
	return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** A short, url-safe slug from a title plus a random suffix to keep it unique. */
export function slugify(title: string): string {
	const base = title
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '') // strip diacritics
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	const suffix = Math.random().toString(36).slice(2, 8);
	return base ? `${base}-${suffix}` : suffix;
}
