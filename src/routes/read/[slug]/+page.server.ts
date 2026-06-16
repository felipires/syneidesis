import { error } from '@sveltejs/kit';
import { marked } from 'marked';
import { getPublicArticleBySlug } from '$lib/server/db';
import type { PageServerLoad } from './$types';

// Public, server-rendered from the server DB so a shared link works for anyone.
export const load: PageServerLoad = async ({ params }) => {
	const article = await getPublicArticleBySlug(params.slug);
	if (!article) throw error(404, 'This piece is private or no longer exists.');

	return {
		title: article.title,
		html: marked.parse(article.body) as string,
		entryDate: article.entryDate,
		updatedAt: article.updatedAt
	};
};
