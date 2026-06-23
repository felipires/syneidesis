<script lang="ts">
	import { page } from '$app/state';
	import { theme } from '$lib/theme.svelte';
	import { ui } from '$lib/ui.svelte';
	import { sync } from '$lib/sync/sync.svelte';

	// In Zen mode the whole bar lifts away.
	let hidden = $derived(ui.zen);
	// App-only chrome; hide on public /read pages and the login page.
	let appChrome = $derived(
		!page.url.pathname.startsWith('/read') && page.url.pathname !== '/login'
	);

	const label: Record<string, string> = {
		idle: 'synced',
		syncing: 'syncing…',
		offline: 'offline',
		error: 'retrying…'
	};
</script>

<header class:hidden aria-hidden={hidden}>
	<a class="wordmark meta" href="/">syneidesis</a>

	<nav>
		{#if appChrome}
			<span class="sync meta" data-state={sync.status} title="Sync status">
				<span class="syncdot"></span>
				{label[sync.status]}
			</span>
			<a class="acct meta" href="/account" title="Account">account</a>
		{/if}
		<button
			type="button"
			class="ghost"
			onclick={() => theme.toggle()}
			title={theme.effective === 'night' ? 'Switch to day' : 'Switch to night'}
			aria-label={theme.effective === 'night' ? 'Switch to day' : 'Switch to night'}
		>
			{#if theme.effective === 'night'}
				<!-- sun -->
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
				</svg>
			{:else}
				<!-- moon -->
				<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
					<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
				</svg>
			{/if}
		</button>
	</nav>
</header>

<style>
	header {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-4);
		padding: var(--s-3) var(--s-6);
		background: color-mix(in oklch, var(--bg) 86%, transparent);
		backdrop-filter: blur(8px);
		transition:
			opacity var(--dur) var(--ease-out),
			transform var(--dur) var(--ease-out);
	}

	/* Zen mode: the bar lifts away. */
	header.hidden {
		opacity: 0;
		transform: translateY(-100%);
		pointer-events: none;
	}

	.wordmark {
		letter-spacing: 0.08em;
		color: var(--muted);
		transition: color var(--dur-fast) var(--ease-out);
	}
	.wordmark:hover {
		color: var(--ink);
		text-decoration: none;
	}

	.acct {
		color: var(--muted);
	}
	.acct:hover {
		color: var(--ink);
		text-decoration: none;
	}

	nav {
		display: flex;
		align-items: center;
		gap: var(--s-4);
	}

	.sync {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		color: var(--muted);
		font-size: 0.75rem;
	}
	.syncdot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--muted);
		transition: background var(--dur-fast) var(--ease-out);
	}
	.sync[data-state='idle'] .syncdot {
		background: oklch(0.62 0.13 150); /* a calm green when settled */
	}
	.sync[data-state='offline'] .syncdot {
		background: var(--muted);
	}
	.sync[data-state='error'] .syncdot {
		background: var(--danger);
	}
	.sync[data-state='syncing'] .syncdot {
		background: var(--accent);
	}

	.ghost {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: none;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		transition:
			color var(--dur-fast) var(--ease-out),
			background var(--dur-fast) var(--ease-out);
	}
	.ghost:hover {
		color: var(--ink);
		background: var(--surface);
	}
</style>
