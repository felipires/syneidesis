/* Single-user auth: one shared password (env SYN_PASSWORD) → one httpOnly cookie.
   No users, no sessions table. If SYN_PASSWORD is unset, auth is DISABLED (open) —
   keeps local dev frictionless; set it in prod (Railway) to lock the app down.
   ponytail: shared-password gate; add real accounts only if this ever has >1 user. */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const COOKIE = 'syn_session';
// Shared-device safety: the session is short-lived AND a session cookie (no
// maxAge → cleared when the browser closes). So a visit always needs a fresh
// live unlock — nobody resumes your session on your device.
// ponytail: tune the window here; shorter = stricter.
const TTL_MS = 30 * 60 * 1000;

const password = () => process.env.SYN_PASSWORD;

export const authEnabled = () => !!password();

/** HMAC-ish signature binding an expiry to the password secret. */
const sign = (exp: string) => createHash('sha256').update(`${exp}.${password()}`).digest('hex');

/** Cookie value: `<expiryMs>.<signature>`. */
const makeToken = () => {
	const exp = String(Date.now() + TTL_MS);
	return `${exp}.${sign(exp)}`;
};

function safeEq(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function validToken(tok: string | undefined): boolean {
	if (!tok) return false;
	const dot = tok.indexOf('.');
	if (dot < 0) return false;
	const exp = tok.slice(0, dot);
	const sig = tok.slice(dot + 1);
	return safeEq(sig, sign(exp)) && Date.now() < Number(exp);
}

export function checkPassword(pw: string): boolean {
	return authEnabled() && safeEq(pw, password()!);
}

export function isAuthed(cookies: Cookies): boolean {
	if (!authEnabled()) return true;
	return validToken(cookies.get(COOKIE));
}

export function login(cookies: Cookies): void {
	cookies.set(COOKIE, makeToken(), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production'
		// no maxAge/expires → session cookie, gone when the browser closes
	});
}

export function logout(cookies: Cookies): void {
	cookies.delete(COOKIE, { path: '/' });
}
