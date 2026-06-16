<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import VisibilityToggle from '$lib/components/VisibilityToggle.svelte';
	import {
		getContainer,
		updateContainer,
		deleteContainer,
		listJournalEntries,
		getOrCreateTodayEntry
	} from '$lib/db/repo';
	import type { Container, Article, Visibility } from '$lib/db/schema';
	import { formatDay, excerpt } from '$lib/util/format';
	import { debounce } from '$lib/util/debounce';

	const id = page.params.id!;

	let journal = $state<Container | null>(null);
	let entries = $state<Article[]>([]);
	let title = $state('');
	let notFound = $state(false);

	const saveTitle = debounce(async () => {
		if (journal) journal = (await updateContainer(id, { title })) ?? journal;
	}, 600);

	async function setVisibility(v: Visibility) {
		journal = (await updateContainer(id, { visibility: v })) ?? journal;
	}

	async function writeToday() {
		const entry = await getOrCreateTodayEntry(id);
		goto(`/write?id=${entry.id}`);
	}

	async function removeJournal() {
		if (!confirm('Delete this journal? Its entries become articles.')) return;
		await deleteContainer(id);
		goto('/');
	}

	onMount(async () => {
		const c = await getContainer(id);
		if (!c || c.type !== 'journal') {
			notFound = true;
			return;
		}
		journal = c;
		title = c.title;
		entries = await listJournalEntries(id);
	});
</script>

<svelte:head>
	<title>{title.trim() || 'Journal'} · Syneidesis</title>
</svelte:head>

{#if notFound}
	<section class="measure pad">
		<p class="empty">That journal couldn't be found. <a href="/">Back home</a>.</p>
	</section>
{:else if journal}
	<section class="measure pad">
		<header class="head">
			<input
				class="title"
				placeholder="Untitled journal"
				bind:value={title}
				oninput={saveTitle}
				aria-label="Journal title"
			/>
			<div class="controls">
				<VisibilityToggle visibility={journal.visibility} onchange={setVisibility} />
			</div>
		</header>

		{#if journal.visibility === 'public'}
			<p class="share meta">Public at <a href="/read/c/{journal.id}">/read/c/{journal.id}</a></p>
		{/if}

		<div class="actions">
			<button class="primary" type="button" onclick={writeToday}>Write today's entry</button>
		</div>

		{#if entries.length === 0}
			<p class="empty">This journal is a blank morning. Write the first entry.</p>
		{:else}
			<ul class="timeline">
				{#each entries as e (e.id)}
					<li>
						<a href="/write?id={e.id}">
							<span class="when meta">{formatDay(e.entryDate ?? e.createdAt)}</span>
							<span class="what">
								<span class="t">{e.title || excerpt(e.body) || 'Untitled entry'}</span>
								{#if e.title && excerpt(e.body)}
									<span class="ex">{excerpt(e.body)}</span>
								{/if}
							</span>
							{#if e.visibility === 'public'}<span class="pub meta">public</span>{/if}
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		<footer class="foot">
			<button class="danger meta" type="button" onclick={removeJournal}>delete journal</button>
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

	.share {
		margin-top: var(--s-3);
		color: var(--muted);
	}
	.share a {
		color: var(--accent);
	}

	.actions {
		margin: var(--s-6) 0 var(--s-8);
	}
	.primary {
		padding: var(--s-3) var(--s-6);
		border: none;
		border-radius: var(--radius-control);
		background: var(--primary);
		color: var(--primary-ink);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		cursor: pointer;
		transition: filter var(--dur-fast) var(--ease-out);
	}
	.primary:hover {
		filter: brightness(1.06);
	}

	.empty {
		color: var(--muted);
		font-style: italic;
	}

	.timeline {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 2px;
	}
	.timeline a {
		display: grid;
		grid-template-columns: 6.5rem 1fr auto;
		align-items: baseline;
		gap: var(--s-4);
		padding: var(--s-3) var(--s-2);
		color: var(--ink);
		border-radius: var(--radius-control);
		transition: background var(--dur-fast) var(--ease-out);
	}
	.timeline a:hover {
		text-decoration: none;
		background: var(--surface);
	}
	.when {
		color: var(--muted);
	}
	.what {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.what .t {
		font-size: 1.0625rem;
	}
	.what .ex {
		color: var(--muted);
		font-size: 0.95rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.pub {
		color: var(--accent);
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
