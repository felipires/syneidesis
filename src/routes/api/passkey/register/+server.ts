import { json, error, type RequestHandler } from '@sveltejs/kit';
import { registrationOptions, verifyRegistration } from '$lib/server/passkey';

// Enrol a new passkey. Gated by hooks.server.ts → only a logged-in user reaches here.
const CHAL = 'syn_chal';
const chalOpts = { path: '/', httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', maxAge: 300 };

export const GET: RequestHandler = async ({ url, cookies }) => {
	const opts = await registrationOptions(url.hostname);
	cookies.set(CHAL, opts.challenge, chalOpts);
	return json(opts);
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	const challenge = cookies.get(CHAL);
	cookies.delete(CHAL, { path: '/' });
	if (!challenge) throw error(400, 'no challenge');
	const ok = await verifyRegistration(await request.json(), challenge, url.origin, url.hostname);
	if (!ok) throw error(400, 'registration failed');
	return json({ ok: true });
};
