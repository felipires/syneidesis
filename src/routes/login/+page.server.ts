import { fail, redirect } from '@sveltejs/kit';
import { authEnabled, checkPassword, login } from '$lib/server/auth';
import { hasPasskeys } from '$lib/server/passkey';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	if (!authEnabled()) throw redirect(302, '/'); // nothing to log into
	return { hasPasskeys: hasPasskeys() };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		// Once a passkey is enrolled, the password no longer logs in (it only
		// bootstraps the first passkey). Recovery if you lose the device: remove
		// passkeys.json from DATA_DIR on the server. ponytail: server-access recovery.
		if (hasPasskeys()) return fail(403, { disabled: true });
		const pw = (await request.formData()).get('password');
		if (typeof pw !== 'string' || !checkPassword(pw)) return fail(401, { error: true });
		login(cookies);
		throw redirect(303, '/');
	}
};
