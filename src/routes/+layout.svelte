<script lang="ts">
	// Self-hosted fonts (work offline — important for an offline-first app).
	import '@fontsource/spectral/400.css';
	import '@fontsource/spectral/500.css';
	import '@fontsource/spectral/600.css';
	import '@fontsource/spectral/400-italic.css';
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/ibm-plex-mono/500.css';

	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import '$lib/styles/tokens.css';
	import { theme } from '$lib/theme.svelte';
	import { sync } from '$lib/sync/sync.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	let { children } = $props();

	onMount(() => {
		theme.init();
		return () => sync.stop();
	});

	// Sync only runs inside the private app — never on public /read pages (a public
	// visitor must not trigger a pull of the author's data). Starts the first time
	// the author is on an app route.
	let syncStarted = false;
	$effect(() => {
		const isPublic = page.url.pathname.startsWith('/read') || page.url.pathname === '/login';
		if (!isPublic && !syncStarted) {
			syncStarted = true;
			sync.start();
		}
	});
</script>

<TopBar />

<main>
	{@render children()}
</main>

<style>
	main {
		min-height: 100dvh;
	}
</style>
