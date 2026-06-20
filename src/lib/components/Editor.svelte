<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
	import { commonmark } from '@milkdown/kit/preset/commonmark';
	import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
	import { history } from '@milkdown/kit/plugin/history';
	import { $prose as prosePlugin } from '@milkdown/kit/utils';
	import { Plugin } from '@milkdown/kit/prose/state';
	import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
	import '@milkdown/kit/prose/view/style/prosemirror.css';

	let {
		value = '',
		zen = false,
		placeholder = 'Begin…',
		onChange
	}: {
		value?: string;
		zen?: boolean;
		placeholder?: string;
		onChange?: (markdown: string) => void;
	} = $props();

	let root: HTMLDivElement;
	let editor: Editor | undefined;
	// Seed once from the initial markdown; the editor owns content after mount.
	// svelte-ignore state_referenced_locally
	let empty = $state((value ?? '').trim().length === 0);

	// "Light emerges": decorate the block under the caret so it can carry a warm
	// glow (and stay full-ink while the rest dims in Zen). Pure ProseMirror — no
	// per-keystroke Svelte work.
	const currentBlock = prosePlugin(
		() =>
			new Plugin({
				props: {
					decorations(state) {
						try {
							const pos = state.selection.$head.before(1);
							const node = state.doc.nodeAt(pos);
							if (!node) return DecorationSet.empty;
							return DecorationSet.create(state.doc, [
								Decoration.node(pos, pos + node.nodeSize, { class: 'is-current' })
							]);
						} catch {
							return DecorationSet.empty;
						}
					}
				}
			})
	);

	onMount(() => {
		let destroyed = false;
		Editor.make()
			.config((ctx) => {
				ctx.set(rootCtx, root);
				ctx.set(defaultValueCtx, value ?? '');
				ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
					empty = markdown.trim().length === 0;
					onChange?.(markdown);
				});
			})
			.use(commonmark)
			.use(listener)
			.use(history)
			.use(currentBlock)
			.create()
			.then((ed) => {
				if (destroyed) ed.destroy();
				else editor = ed;
			});

		return () => {
			destroyed = true;
			editor?.destroy();
		};
	});
</script>

<div class="editor" class:zen>
	<div class="surface" bind:this={root}></div>
	{#if empty}
		<p class="placeholder" aria-hidden="true">{placeholder}</p>
	{/if}
</div>

<style>
	.editor {
		position: relative;
	}

	.surface :global(.milkdown) {
		outline: none;
	}

	/* The page: one calm serif column. */
	.surface :global(.ProseMirror) {
		max-width: var(--measure);
		margin-inline: auto;
		padding-block: var(--s-4);
		font-family: var(--font-serif);
		font-size: 1.1875rem;
		line-height: 1.72;
		color: var(--ink);
		outline: none;
		caret-color: var(--accent);
	}

	.surface :global(.ProseMirror p),
	.surface :global(.ProseMirror h1),
	.surface :global(.ProseMirror h2),
	.surface :global(.ProseMirror h3),
	.surface :global(.ProseMirror blockquote),
	.surface :global(.ProseMirror ul),
	.surface :global(.ProseMirror ol) {
		margin-block: 0.75em;
		border-radius: 6px;
	}

	/* First block shares the same baseline as the placeholder overlay. */
	.surface :global(.ProseMirror > *:first-child) {
		margin-top: 0;
	}

	.surface :global(.ProseMirror h1) {
		font-size: 1.9rem;
		font-weight: 500;
		line-height: 1.2;
	}
	.surface :global(.ProseMirror h2) {
		font-size: 1.4rem;
		font-weight: 500;
	}
	.surface :global(.ProseMirror h3) {
		font-size: 1.2rem;
		font-weight: 500;
	}

	.surface :global(.ProseMirror blockquote) {
		padding-inline-start: var(--s-4);
		border-inline-start: 2px solid var(--hairline);
		color: var(--muted);
		font-style: italic;
	}

	.surface :global(.ProseMirror a) {
		color: var(--primary);
	}

	/* The gathered light: a soft warm wash behind the line you're writing. */
	.surface :global(.ProseMirror .is-current) {
		background: var(--accent-soft);
		transition: background var(--dur) var(--ease-out);
	}

	/* Zen focus: the rest of the page recedes; the current line stays full-ink. */
	.editor.zen .surface :global(.ProseMirror > *) {
		opacity: 0.50;
		transition: opacity var(--dur) var(--ease-out);
	}
	.editor.zen .surface :global(.ProseMirror > .is-current) {
		opacity: 1;
	}

	/* Placeholder, aligned to the first line of the measure column. */
	.placeholder {
		position: absolute;
		inset-block-start: var(--s-4);
		inset-inline: 0;
		max-width: var(--measure);
		margin-inline: auto;
		font-size: 1.1875rem;
		line-height: 1.72;
		color: var(--muted);
		opacity: 0.7;
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.surface :global(.ProseMirror .is-current),
		.editor.zen .surface :global(.ProseMirror > *) {
			transition: none;
		}
	}
</style>
