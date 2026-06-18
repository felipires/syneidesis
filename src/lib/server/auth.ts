/* Single-user auth: one shared password (env SYN_PASSWORD) → one httpOnly cookie.
   No users, no sessions table. If SYN_PASSWORD is unset, auth is DISABLED (open) —
   keeps local dev frictionless; set it in prod (Railway) to lock the app down.
   ponytail: shared-password gate; add real accounts only if this ever has >1 user. */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const COOKIE = 'syn_session';
const password = () => process.env.SYN_PASSWORD;

export const authEnabled = () => !!password();

/** The cookie value: a stable token derived from the password (single user). */
const token = () => createHash('sha256').update(password()!).digest('hex');

function safeEq(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(pw: string): boolean {
	return authEnabled() && safeEq(pw, password()!);
}

export function isAuthed(cookies: Cookies): boolean {
	if (!authEnabled()) return true;
	const c = cookies.get(COOKIE);
	return !!c && safeEq(c, token());
}

export function login(cookies: Cookies): void {
	cookies.set(COOKIE, token(), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 365
	});
}
