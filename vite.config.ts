import adapter from 'svelte-adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';
import sqlocal from 'sqlocal/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		// SQLocal's official plugin: excludes sqlocal + @sqlite.org/sqlite-wasm from
		// pre-bundling, serves workers as ES modules, and sets the COOP/COEP
		// (cross-origin isolation) headers in dev so OPFS persistence works. In
		// production the same headers are set by src/hooks.server.ts.
		sqlocal(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Build a Bun server (svelte-adapter-bun) so production runs under the
			// Bun runtime — required for the server's `bun:sqlite`. Output: ./build,
			// started with `bun ./build/index.js`. Listens on $PORT (Railway sets it).
			adapter: adapter()
		})
	]
});
