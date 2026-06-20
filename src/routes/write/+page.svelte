<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Editor from '$lib/components/Editor.svelte';
	import VisibilityToggle from '$lib/components/VisibilityToggle.svelte';
	import { ui } from '$lib/ui.svelte';
	import { sync } from '$lib/sync/sync.svelte';
	import { createArticle, getArticle, updateArticle, deleteArticle } from '$lib/db/repo';
	import { debounce } from '$lib/util/debounce';
	import type { Article, Visibility } from '$lib/db/schema';

	type SaveState = 'idle' | 'saving' | 'saved';

	let article = $state<Article | null>(null);
	let title = $state('');
	let body = $state('');
	let saveState = $state<SaveState>('idle');
	let savedTimer: ReturnType<typeof setTimeout> | undefined;
	let deleted = false; // set on explicit delete so onDestroy doesn't re-save/clean

	// Optional ?id=… to resume an entry; otherwise start a fresh loose draft.
	const idParam = page.url.searchParams.get('id');
	const journalParam = page.url.searchParams.get('journal');

	async function persist() {
		if (!article) return;
		saveState = 'saving';
		const next = await updateArticle(article.id, { title, body });
		if (next) article = next;
		saveState = 'saved';
		clearTimeout(savedTimer);
		savedTimer = setTimeout(() => (saveState = 'idle'), 1400);
		sync.nudge();
	}

	const scheduleSave = debounce(persist, 600);

	async function setVisibility(v: Visibility) {
		if (!article) return;
		// Persist any pending text first so the saved record matches what's on screen.
		scheduleSave.flush();
		const next = await updateArticle(article.id, { visibility: v });
		if (next) article = next;
	}

	async function remove() {
		if (!article) return;
		if (!confirm('Delete this piece? This can’t be undone.')) return;
		deleted = true;
		scheduleSave.cancel();
		const home = article.homeContainerId;
		await deleteArticle(article.id);
		sync.nudge();
		goto(home ? `/journal/${home}` : '/');
	}

	function onBody(markdown: string) {
		body = markdown;
		scheduleSave();
	}

	function onTitleInput() {
		scheduleSave();
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && ui.zen) ui.exitZen();
	}

	onMount(async () => {
		if (idParam) {
			const existing = await getArticle(idParam);
			if (existing) {
				article = existing;
				title = existing.title;
				body = existing.body;
				return;
			}
		}
		article = await createArticle({ homeContainerId: journalParam ?? null });
	});

	// Keep Zen in sync when the user leaves full-screen via Esc / F11 / browser UI.
	onMount(() => ui.bindFullscreen());

	onDestroy(() => {
		if (deleted) {
			scheduleSave.cancel();
		} else if (article && !title.trim() && !body.trim()) {
			// Don't leave empty "Untitled" drafts behind if nothing was written.
			scheduleSave.cancel();
			deleteArticle(article.id);
		} else {
			scheduleSave.flush();
		}
		ui.exitZen();
		clearTimeout(savedTimer);
	});
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
	<title>{title.trim() || 'Writing'} · Syneidesis</title>
</svelte:head>

<div class="write" class:zen={ui.zen}>
	<div class="bar measure">
		<span class="left">
			{#if article}
				<VisibilityToggle visibility={article.visibility} onchange={setVisibility} />
			{/if}
			<span class="save meta" data-state={saveState}>
				<span class="dot"></span>
				{saveState === 'saving' ? 'saving' : saveState === 'saved' ? 'saved' : ''}
			</span>
		</span>
		<span class="right">
			{#if article}
				<button class="del meta" type="button" onclick={remove}>delete</button>
			{/if}
			<button class="zenbtn meta" type="button" onclick={() => ui.toggleZen()}>
				{ui.zen ? 'exit zen — esc' : 'zen'}
			</button>
		</span>
	</div>

	{#if article?.visibility === 'public' && article.publicSlug}
		<p class="share meta measure">
			Shared at <a href="/read/{article.publicSlug}">/read/{article.publicSlug}</a>
		</p>
	{/if}

	<textarea
		class="title"
		placeholder="Untitled"
		rows="1"
		bind:value={title}
		oninput={onTitleInput}
		onkeydown={(e) => e.key === 'Enter' && e.preventDefault()}
		aria-label="Title"
	></textarea>

	{#if article}
		<Editor value={body} zen={ui.zen} placeholder="Let a thought arrive…" onChange={onBody} />
	{/if}
</div>

<style>
	.write {
		padding: var(--s-8) var(--s-6) var(--s-24);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--s-4);
		min-height: 1.4rem;
		margin-bottom: var(--s-6);
		transition: opacity var(--dur) var(--ease-out);
	}
	.write.zen .bar {
		opacity: 0; /* but still reachable for keyboard; revealed on focus */
	}
	.write.zen .bar:focus-within {
		opacity: 1;
	}

	.left {
		display: inline-flex;
		align-items: center;
		gap: var(--s-4);
	}
	.right {
		display: inline-flex;
		align-items: center;
		gap: var(--s-3);
	}
	.del {
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		padding: var(--s-1) var(--s-2);
		border-radius: var(--radius-control);
		transition: color var(--dur-fast) var(--ease-out);
	}
	.del:hover {
		color: var(--danger);
	}
	.share {
		margin: 0 auto var(--s-4);
		color: var(--muted);
	}
	.share a {
		color: var(--accent);
	}
	.save {
		display: inline-flex;
		align-items: center;
		gap: var(--s-2);
		color: var(--muted);
	}
	.save .dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: transparent;
		transition: background var(--dur) var(--ease-out);
	}
	/* The single amber save-pulse — the only "saved" signal. */
	.save[data-state='saved'] .dot {
		background: var(--accent);
		animation: breathe 1.2s var(--ease-out);
	}
	.save[data-state='saving'] .dot {
		background: var(--muted);
	}

	@keyframes breathe {
		0% {
			transform: scale(0.6);
			opacity: 0.4;
		}
		40% {
			transform: scale(1.25);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.zenbtn {
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		padding: var(--s-1) var(--s-2);
		border-radius: var(--radius-control);
	}
	.zenbtn:hover {
		color: var(--ink);
	}

	.title {
		display: block;
		max-width: var(--measure);
		margin-inline: auto;
		margin-bottom: var(--s-2);
		width: 100%;
		padding: 0; /* line the title's glyph edge up with the editor body */
		border: none;
		background: transparent;
		color: var(--ink);
		font-family: var(--font-serif);
		font-size: 2rem;
		font-weight: 500;
		/* textarea that wraps + grows with its content instead of clipping */
		field-sizing: content;
		resize: none;
		overflow: hidden;
		line-height: 1.2;
		line-height: 1.2;
		letter-spacing: -0.01em;
	}
	.title::placeholder {
		color: var(--muted);
		opacity: 0.6;
	}
	.title:focus {
		outline: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.save[data-state='saved'] .dot {
			animation: none;
		}
	}
</style>
