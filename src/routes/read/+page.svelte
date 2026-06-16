<script lang="ts">
	import { formatDay } from '$lib/util/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let empty = $derived(data.containers.length === 0 && data.articles.length === 0);
</script>

<svelte:head>
	<title>Syneidesis — public writing</title>
</svelte:head>

<section class="index measure">
	<header class="top">
		<h1>Writing in the light.</h1>
		<p class="lede">Pieces shared publicly.</p>
	</header>

	{#if empty}
		<p class="empty">Nothing has been shared yet.</p>
	{:else}
		{#if data.containers.length}
			<ul class="rows">
				{#each data.containers as c (c.id)}
					<li>
						<a href="/read/c/{c.id}">
							<span class="t">{c.title || 'Untitled'}</span>
							<span class="meta">{c.type}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.articles.length}
			<ul class="rows">
				{#each data.articles as a (a.slug)}
					<li>
						<a href="/read/{a.slug}">
							<span class="t">{a.title || 'Untitled'}</span>
							<span class="meta">{formatDay(a.updatedAt)}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</section>

<style>
	.index {
		padding: clamp(var(--s-12), 14vh, var(--s-24)) var(--s-6) var(--s-24);
	}
	.top {
		margin-bottom: var(--s-12);
	}
	h1 {
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
		margin-bottom: var(--s-8);
	}
	.rows a {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
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
	.t {
		font-size: 1.0625rem;
	}
</style>
