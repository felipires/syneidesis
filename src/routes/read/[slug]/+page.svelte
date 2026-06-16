<script lang="ts">
	import { formatLong, formatDay } from '$lib/util/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let when = $derived(data.entryDate ? formatDay(data.entryDate) : formatLong(data.updatedAt));
</script>

<svelte:head>
	<title>{data.title || 'A piece'} · Syneidesis</title>
	<meta name="description" content={data.title} />
</svelte:head>

<article class="reader measure">
	<p class="meta when">{when}</p>
	{#if data.title}
		<h1>{data.title}</h1>
	{/if}
	<div class="prose">
		{@html data.html}
	</div>
	<footer class="foot">
		<a class="meta" href="/read">More writing</a>
	</footer>
</article>

<style>
	.reader {
		padding: clamp(var(--s-12), 14vh, var(--s-24)) var(--s-6) var(--s-24);
	}
	.when {
		margin-bottom: var(--s-4);
	}
	h1 {
		font-size: 2.25rem;
		font-weight: 500;
		letter-spacing: -0.01em;
		margin-bottom: var(--s-8);
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
