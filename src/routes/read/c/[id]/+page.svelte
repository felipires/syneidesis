<script lang="ts">
	import { formatDay } from '$lib/util/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.container.title || 'Collection'} · Syneidesis</title>
</svelte:head>

<section class="container measure">
	<header class="top">
		<p class="meta">{data.container.type}</p>
		<h1>{data.container.title || 'Untitled'}</h1>
		{#if data.container.description}
			<p class="lede">{data.container.description}</p>
		{/if}
	</header>

	{#if data.entries.length === 0}
		<p class="empty">Nothing public here yet.</p>
	{:else}
		<ul class="rows">
			{#each data.entries as e (e.slug)}
				<li>
					<a href="/read/{e.slug}">
						<span class="when meta">{formatDay(e.entryDate ?? e.updatedAt)}</span>
						<span class="t">{e.title || 'Untitled'}</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<footer class="foot">
		<a class="meta" href="/read">More writing</a>
	</footer>
</section>

<style>
	.container {
		padding: clamp(var(--s-12), 14vh, var(--s-24)) var(--s-6) var(--s-24);
	}
	.top {
		margin-bottom: var(--s-12);
	}
	h1 {
		margin-top: var(--s-2);
		font-size: 2.25rem;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.lede {
		margin-top: var(--s-3);
		color: var(--muted);
	}
	.empty {
		color: var(--muted);
		font-style: italic;
	}
	.rows {
		list-style: none;
		padding: 0;
	}
	.rows a {
		display: grid;
		grid-template-columns: 6.5rem 1fr;
		align-items: baseline;
		gap: var(--s-4);
		padding: var(--s-3) var(--s-2);
		color: var(--ink);
		border-radius: var(--radius-control);
		transition: background var(--dur-fast) var(--ease-out);
	}
	.rows a:hover {
		text-decoration: none;
		background: var(--surface);
	}
	.when {
		color: var(--muted);
	}
	.t {
		font-size: 1.0625rem;
	}
	.foot {
		margin-top: var(--s-16);
		padding-top: var(--s-4);
		border-top: 1px solid var(--hairline);
	}
	.foot a {
		color: var(--muted);
	}
</style>
