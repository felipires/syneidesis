<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import VisibilityToggle from '$lib/components/VisibilityToggle.svelte';
	import {
		getContainer,
		updateContainer,
		deleteContainer,
		listCollectionEntries,
		listAllArticles,
		addArticleToCollection,
		removeRef,
		reorderRefs,
		type CollectionEntry
	} from '$lib/db/repo';
	import type { Container, Article, Visibility } from '$lib/db/schema';
	import { excerpt } from '$lib/util/format';
	import { debounce } from '$lib/util/debounce';

	const id = page.params.id!;

	let collection = $state<Container | null>(null);
	let entries = $state<CollectionEntry[]>([]);
	let allArticles = $state<Article[]>([]);
	let title = $state('');
	let notFound = $state(false);

	// Articles not already in this collection — the picker's candidates.
	let candidates = $derived(
		allArticles.filter((a) => !entries.some((e) => e.id === a.id))
	);

	const saveTitle = debounce(async () => {
		if (collection) collection = (await updateContainer(id, { title })) ?? collection;
	}, 600);

	async function setVisibility(v: Visibility) {
		collection = (await updateContainer(id, { visibility: v })) ?? collection;
	}

	async function reload() {
		[entries, allArticles] = await Promise.all([listCollectionEntries(id), listAllArticles()]);
	}

	async function add(articleId: string) {
		await addArticleToCollection(id, articleId);
		await reload();
	}

	async function remove(refId: string) {
		await removeRef(refId);
		await reload();
	}

	async function move(index: number, delta: number) {
		const next = index + delta;
		if (next < 0 || next >= entries.length) return;
		const order = entries.map((e) => e.refId);
		[order[index], order[next]] = [order[next], order[index]];
		await reorderRefs(order);
		await reload();
	}

	async function removeCollection() {
		if (!confirm('Delete this collection? The articles themselves are kept.')) return;
		await deleteContainer(id);
		goto('/');
	}

	onMount(async () => {
		const c = await getContainer(id);
		if (!c || c.type !== 'collection') {
			notFound = true;
			return;
		}
		collection = c;
		title = c.title;
		await reload();
	});
</script>

<svelte:head>
	<title>{title.trim() || 'Collection'} · Syneidesis</title>
</svelte:head>

{#if notFound}
	<section class="measure pad">
		<p class="empty">That collection couldn't be found. <a href="/">Back home</a>.</p>
	</section>
{:else if collection}
	<section class="measure pad">
		<header class="head">
			<input
				class="title"
				placeholder="Untitled collection"
				bind:value={title}
				oninput={saveTitle}
				aria-label="Collection title"
			/>
			<div class="controls">
				<VisibilityToggle visibility={collection.visibility} onchange={setVisibility} />
			</div>
		</header>

		{#if collection.visibility === 'public'}
			<p class="share meta">Public at <a href="/read/c/{collection.id}">/read/c/{collection.id}</a></p>
		{/if}

		{#if entries.length === 0}
			<p class="empty">Nothing gathered yet. Add a piece below to begin the order.</p>
		{:else}
			<ol class="list">
				{#each entries as e, i (e.refId)}
					<li>
						<span class="ord meta">{i + 1}</span>
						<a class="link" href="/write?id={e.id}">
							<span class="t">{e.title || excerpt(e.body) || 'Untitled'}</span>
						</a>
						<span class="tools">
							<button class="ic" type="button" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
							<button class="ic" type="button" onclick={() => move(i, 1)} disabled={i === entries.length - 1} aria-label="Move down">↓</button>
							<button class="ic" type="button" onclick={() => remove(e.refId)} aria-label="Remove">×</button>
						</span>
					</li>
				{/each}
			</ol>
		{/if}

		<details class="picker">
			<summary class="meta">+ add a piece</summary>
			{#if candidates.length === 0}
				<p class="empty pick-empty">No other pieces to add yet. Write some first.</p>
			{:else}
				<ul class="cands">
					{#each candidates as a (a.id)}
						<li>
							<button type="button" onclick={() => add(a.id)}>
								{a.title || excerpt(a.body) || 'Untitled'}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</details>

		<footer class="foot">
			<button class="danger meta" type="button" onclick={removeCollection}>delete collection</button>
		</footer>
	</section>
{/if}

<style>
	.pad {
		padding: var(--s-8) var(--s-6) var(--s-24);
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--s-4);
		flex-wrap: wrap;
		margin-bottom: var(--s-4);
	}
	.share {
		margin-bottom: var(--s-8);
		color: var(--muted);
	}
	.share a {
		color: var(--accent);
	}
	.title {
		flex: 1 1 14rem;
		border: none;
		background: transparent;
		color: var(--ink);
		font-family: var(--font-serif);
		font-size: 2rem;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.title:focus {
		outline: none;
	}
	.title::placeholder {
		color: var(--muted);
		opacity: 0.6;
	}
	.controls {
		padding-top: var(--s-2);
	}

	.empty {
		color: var(--muted);
		font-style: italic;
	}

	.list {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 2px;
	}
	.list li {
		display: grid;
		grid-template-columns: 2rem 1fr auto;
		align-items: center;
		gap: var(--s-3);
		padding: var(--s-2);
		border-radius: var(--radius-control);
	}
	.list li:hover {
		background: var(--surface);
	}
	.ord {
		color: var(--muted);
		text-align: right;
	}
	.link {
		color: var(--ink);
		min-width: 0;
	}
	.link .t {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tools {
		display: inline-flex;
		gap: 2px;
		opacity: 0;
		transition: opacity var(--dur-fast) var(--ease-out);
	}
	.list li:hover .tools,
	.list li:focus-within .tools {
		opacity: 1;
	}
	.ic {
		width: 28px;
		height: 28px;
		border: none;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		font-size: 0.95rem;
	}
	.ic:hover:not(:disabled) {
		color: var(--ink);
		background: var(--bg);
	}
	.ic:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.picker {
		margin-top: var(--s-8);
	}
	.picker summary {
		cursor: pointer;
		color: var(--muted);
		padding: var(--s-2);
		width: max-content;
		border-radius: var(--radius-control);
	}
	.picker summary:hover {
		color: var(--accent);
	}
	.pick-empty {
		padding: var(--s-2);
	}
	.cands {
		list-style: none;
		padding: var(--s-2) 0 0;
		display: grid;
		gap: 2px;
	}
	.cands button {
		width: 100%;
		text-align: left;
		border: none;
		background: transparent;
		color: var(--ink);
		font-family: var(--font-serif);
		font-size: 1rem;
		padding: var(--s-2);
		border-radius: var(--radius-control);
		cursor: pointer;
	}
	.cands button:hover {
		background: var(--surface);
	}

	.foot {
		margin-top: var(--s-16);
		padding-top: var(--s-4);
		border-top: 1px solid var(--hairline);
	}
	.danger {
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		padding: var(--s-1) var(--s-2);
	}
	.danger:hover {
		color: var(--danger);
	}
</style>
