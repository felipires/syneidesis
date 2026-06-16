/** Human dates, kept consistent across the app (mono "meta" voice). */

const longFmt = new Intl.DateTimeFormat('en', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});

const dayFmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long' });

/** A full ISO timestamp → "Monday, 15 June 2026". */
export function formatLong(iso: string): string {
	return longFmt.format(new Date(iso));
}

/** A `YYYY-MM-DD` (or ISO) → "15 June". */
export function formatDay(date: string): string {
	// Treat a bare date as local noon to avoid TZ rollovers.
	const d = date.length === 10 ? new Date(`${date}T12:00:00`) : new Date(date);
	return dayFmt.format(d);
}

/** First non-empty line of markdown, lightly stripped, for previews. */
export function excerpt(markdown: string, max = 100): string {
	const line =
		markdown
			.split('\n')
			.map((l) => l.replace(/^#+\s*/, '').replace(/[*_`>#-]/g, '').trim())
			.find((l) => l.length > 0) ?? '';
	return line.length > max ? line.slice(0, max).trimEnd() + '…' : line;
}
