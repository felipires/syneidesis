import { json, error, type RequestHandler } from '@sveltejs/kit';
import { authenticationOptions, verifyAuthentication } from '$lib/server/passkey';
import { login } from '$lib/server/auth';

// Passkey sign-in. OPEN (pre-login) — see the allowlist in hooks.server.ts.
const CHAL = 'syn_chal';
const chalOpts = { path: '/', httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', maxAge: 300 };

export const GET: RequestHandler = async ({ url, cookies }) => {
	const opts = await authenticationOptions(url.hostname);
	cookies.set(CHAL, opts.challenge, chalOpts);
	return json(opts);
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	const challenge = cookies.get(CHAL);
	cookies.delete(CHAL, { path: '/' });
	if (!challenge) throw error(400, 'no challenge');
	const ok = await verifyAuthentication(await request.json(), challenge, url.origin, url.hostname);
	if (!ok) throw error(401, 'authentication failed');
	login(cookies); // sets the session cookie
	return json({ ok: true });
};
