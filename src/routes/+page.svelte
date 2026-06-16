<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		listContainers,
		listLooseArticles,
		createContainer
	} from '$lib/db/repo';
	import type { Container, Article } from '$lib/db/schema';
	import { formatDay, excerpt } from '$lib/util/format';

	const today = new Intl.DateTimeFormat('en', {
		weekday: 'long',
		day: 'numeric',
		month: 'long'
	}).format(new Date());

	let journals = $state<Container[]>([]);
	let collections = $state<Container[]>([]);
	let loose = $state<Article[]>([]);
	let loaded = $state(false);

	async function refresh() {
		[journals, collections, loose] = await Promise.all([
			listContainers('journal'),
			listContainers('collection'),
			listLooseArticles()
		]);
		loaded = true;
	}

	async function newJournal() {
		const c = await createContainer({ type: 'journal', title: 'Untitled journal' });
		goto(`/journal/${c.id}`);
	}

	async function newCollection() {
		const c = await createContainer({ type: 'collection', title: 'Untitled collection' });
		goto(`/collection/${c.id}`);
	}

	onMount(refresh);
</script>

<svelte:head>
	<title>Syneidesis</title>
</svelte:head>

<section class="hero measure">
	<p class="meta">{today}</p>
	<h1>A quiet place to write.</h1>
	<p class="lede">
		Every concept is a small universe. Sit, and let a little light gather around the things
		you discover.
	</p>
	<div class="actions">
		<a class="primary" href="/write">Write something</a>
	</div>
</section>

{#if loaded}
	<div class="library measure">
		<!-- Journals -->
		<section class="group">
			<header class="grouphead">
				<h2>Journals</h2>
				<button class="add meta" type="button" onclick={newJournal}>+ new journal</button>
			</header>
			{#if journals.length === 0}
				<p class="empty">A journal is a dated stream — somewhere to return each day.</p>
			{:else}
				<ul class="rows">
					{#each journals as j (j.id)}
						<li>
							<a href="/journal/{j.id}">
								<span class="rowtitle">{j.title || 'Untitled journal'}</span>
								<span class="meta">{j.visibility}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Collections -->
		<section class="group">
			<header class="grouphead">
				<h2>Collections</h2>
				<button class="add meta" type="button" onclick={newCollection}>+ new collection</button>
			</header>
			{#if collections.length === 0}
				<p class="empty">A collection gathers loose pieces into a deliberate order.</p>
			{:else}
				<ul class="rows">
					{#each collections as c (c.id)}
						<li>
							<a href="/collection/{c.id}">
								<span class="rowtitle">{c.title || 'Untitled collection'}</span>
								<span class="meta">{c.visibility}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<!-- Loose writing -->
		<section class="group">
			<header class="grouphead">
				<h2>Articles</h2>
			</header>
			{#if loose.length === 0}
				<p class="empty">Standalone pieces with no home land here.</p>
			{:else}
				<ul class="rows">
					{#each loose as a (a.id)}
						<li>
							<a href="/write?id={a.id}">
								<span class="rowtitle">{a.title || excerpt(a.body) || 'Untitled'}</span>
								<span class="meta">{formatDay(a.updatedAt)}</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	</div>
{/if}

<style>
	.hero {
		padding: clamp(var(--s-12), 12vh, var(--s-24)) var(--s-6) var(--s-8);
	}
	.hero h1 {
		margin-top: var(--s-6);
		font-size: 2.25rem;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.lede {
		margin-top: var(--s-4);
		font-size: 1.1875rem;
		line-height: 1.72;
		color: var(--muted);
	}
	.actions {
		margin-top: var(--s-8);
	}
	.primary {
		padding: var(--s-3) var(--s-6);
		border-radius: var(--radius-control);
		background: var(--primary);
		color: var(--primary-ink);
		font-family: var(--font-mono);
		font-size: 0.875rem;
	}
	.primary:hover {
		text-decoration: none;
		filter: brightness(1.06);
	}

	.library {
		padding: 0 var(--s-6) var(--s-24);
		display: grid;
		gap: var(--s-12);
	}

	.grouphead {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--s-4);
		padding-bottom: var(--s-3);
		border-bottom: 1px solid var(--hairline);
	}
	.grouphead h2 {
		font-size: 1.25rem;
		font-weight: 500;
	}
	.add {
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		padding: var(--s-1) var(--s-2);
		border-radius: var(--radius-control);
	}
	.add:hover {
		color: var(--accent);
	}

	.empty {
		margin-top: var(--s-4);
		color: var(--muted);
		font-style: italic;
	}

	.rows {
		list-style: none;
		padding: 0;
		margin-top: var(--s-2);
	}
	.rows li a {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--s-4);
		padding: var(--s-3) var(--s-2);
		color: var(--ink);
		border-radius: var(--radius-control);
		transition: background var(--dur-fast) var(--ease-out);
	}
	.rows li a:hover {
		text-decoration: none;
		background: var(--surface);
	}
	.rowtitle {
		font-size: 1.0625rem;
	}
</style>
