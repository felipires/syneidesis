import { error } from '@sveltejs/kit';
import {
	getPublicContainer,
	listPublicJournalEntries,
	listPublicCollectionArticles
} from '$lib/server/db';
import type { PageServerLoad } from './$types';

// A public journal or collection: lists only its public pieces, in lens order.
export const load: PageServerLoad = async ({ params }) => {
	const container = await getPublicContainer(params.id);
	if (!container) throw error(404, 'This is private or no longer exists.');

	const articles =
		container.type === 'journal'
			? await listPublicJournalEntries(container.id)
			: await listPublicCollectionArticles(container.id);

	return {
		container: { type: container.type, title: container.title, description: container.description },
		entries: articles.map((a) => ({
			slug: a.publicSlug,
			title: a.title,
			entryDate: a.entryDate,
			updatedAt: a.updatedAt
		}))
	};
};
