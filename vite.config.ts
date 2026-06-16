import adapter from 'svelte-adapter-bun';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
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
	],

	// SQLocal ships its own worker + wasm for in-browser (OPFS) SQLite; don't let
	// Vite pre-bundle it, and serve workers as ES modules.
	optimizeDeps: {
		exclude: ['sqlocal']
	},
	worker: {
		format: 'es'
	}
});
