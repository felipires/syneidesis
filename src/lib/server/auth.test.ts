import { test, expect } from 'bun:test';
import { createHash } from 'node:crypto';

process.env.SYN_PASSWORD = 'hunter2';
const { authEnabled, checkPassword, isAuthed } = await import('./auth');

const goodCookie = createHash('sha256').update('hunter2').digest('hex');
const cookies = (v?: string) => ({ get: () => v }) as never;

test('auth gate', () => {
	expect(authEnabled()).toBe(true);
	expect(checkPassword('hunter2')).toBe(true);
	expect(checkPassword('wrong')).toBe(false);
	expect(isAuthed(cookies(goodCookie))).toBe(true);
	expect(isAuthed(cookies('tampered'))).toBe(false);
	expect(isAuthed(cookies(undefined))).toBe(false);
});
