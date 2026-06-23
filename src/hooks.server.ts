import { redirect, type Handle } from '@sveltejs/kit';
import { isAuthed } from '$lib/server/auth';

/* Gate everything except the public reader and the login page. Unauthed:
   APIs get 401, pages redirect to /login. (Built _app/static assets are served
   by the adapter and bypass this hook, so the login page still loads.) */
export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const open =
		pathname === '/login' ||
		pathname.startsWith('/read') ||
		pathname.startsWith('/api/passkey/auth'); // passkey sign-in is pre-login

	if (!open && !isAuthed(event.cookies)) {
		if (pathname.startsWith('/api')) return new Response('Unauthorized', { status: 401 });
		throw redirect(302, '/login');
	}

	return resolve(event);
};
