import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';

process.env.SYN_PASSWORD = 'hunter2';
const { authEnabled, checkPassword, isAuthed } = await import('./auth');

// Mirror the cookie format: `<expiryMs>.<sha256(exp.password)>`.
const tok = (exp: number) => `${exp}.${createHash('sha256').update(`${exp}.hunter2`).digest('hex')}`;
const cookies = (v?: string) => ({ get: () => v }) as never;

test('auth gate', () => {
	expect(authEnabled()).toBe(true);
	expect(checkPassword('hunter2')).toBe(true);
	expect(checkPassword('wrong')).toBe(false);

	expect(isAuthed(cookies(tok(Date.now() + 60_000)))).toBe(true); // fresh
	expect(isAuthed(cookies(tok(Date.now() - 60_000)))).toBe(false); // expired
	expect(isAuthed(cookies(`${Date.now() + 60_000}.bad`))).toBe(false); // bad sig
	expect(isAuthed(cookies('garbage'))).toBe(false);
	expect(isAuthed(cookies(undefined))).toBe(false);
});
