import { listPublicIndex } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// The public landing: everything the author has chosen to make public.
export const load: PageServerLoad = async () => {
	const { containers, articles } = await listPublicIndex();
	return {
		containers: containers.map((c) => ({ id: c.id, type: c.type, title: c.title })),
		articles: articles.map((a) => ({
			slug: a.publicSlug,
			title: a.title,
			updatedAt: a.updatedAt
		}))
	};
};
