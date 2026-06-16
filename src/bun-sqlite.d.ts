/* Minimal ambient types for Bun's built-in SQLite, so svelte-check resolves the
   `bun:sqlite` import without pulling in all of bun-types (which clashes with
   @types/node globals). The module is loaded at runtime under Bun only. */
declare module 'bun:sqlite' {
	export interface Statement<T = unknown> {
		all(...params: unknown[]): T[];
		get(...params: unknown[]): T | null;
		run(...params: unknown[]): void;
	}
	export class Database {
		constructor(
			filename?: string,
			options?: { create?: boolean; readonly?: boolean; readwrite?: boolean }
		);
		run(sql: string, ...params: unknown[]): void;
		exec(sql: string): void;
		query<T = unknown>(sql: string): Statement<T>;
		prepare<T = unknown>(sql: string): Statement<T>;
		close(): void;
	}
}
