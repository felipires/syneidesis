import { fail, redirect } from '@sveltejs/kit';
import { authEnabled, checkPassword, login } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	if (!authEnabled()) throw redirect(302, '/'); // nothing to log into
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const pw = (await request.formData()).get('password');
		if (typeof pw !== 'string' || !checkPassword(pw)) return fail(401, { error: true });
		login(cookies);
		throw redirect(303, '/');
	}
};
