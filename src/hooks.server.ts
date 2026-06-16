import type { Handle } from '@sveltejs/kit';

/* Cross-origin isolation.

   SQLocal persists the local SQLite database to the browser's OPFS, which needs
   `SharedArrayBuffer` + `Atomics`. Browsers only expose those when the document is
   cross-origin isolated, which requires these two response headers. Without them,
   persistence silently fails and the offline-first store resets on reload.

   Every resource this app loads is same-origin (self-hosted fonts, same-origin
   wasm/workers), and same-origin subresources pass the CORP check by default, so
   `require-corp` blocks nothing here. */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	// Belt-and-suspenders: lets same-origin subresources satisfy require-corp even
	// where the header is checked explicitly.
	response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
	return response;
};
