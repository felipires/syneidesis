import { redirect } from '@sveltejs/kit';
import { logout } from '$lib/server/auth';
import { hasPasskeys } from '$lib/server/passkey';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ hasPasskeys: hasPasskeys() });

export const actions: Actions = {
	logout: async ({ cookies }) => {
		logout(cookies);
		throw redirect(303, '/login');
	}
};
