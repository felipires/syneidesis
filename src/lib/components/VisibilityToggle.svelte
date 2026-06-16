<script lang="ts">
	import type { Visibility } from '$lib/db/schema';

	let {
		visibility,
		onchange
	}: { visibility: Visibility; onchange: (v: Visibility) => void } = $props();
</script>

<div class="seg" role="group" aria-label="Visibility">
	<button
		type="button"
		class="opt"
		class:active={visibility === 'private'}
		aria-pressed={visibility === 'private'}
		onclick={() => onchange('private')}
	>
		private
	</button>
	<button
		type="button"
		class="opt"
		class:active={visibility === 'public'}
		aria-pressed={visibility === 'public'}
		onclick={() => onchange('public')}
	>
		public
	</button>
</div>

<style>
	.seg {
		display: inline-flex;
		gap: 2px;
		padding: 2px;
		border: 1px solid var(--hairline);
		border-radius: var(--radius-control);
		background: var(--surface);
	}
	.opt {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		letter-spacing: 0.02em;
		padding: var(--s-1) var(--s-3);
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--muted);
		cursor: pointer;
		transition:
			color var(--dur-fast) var(--ease-out),
			background var(--dur-fast) var(--ease-out);
	}
	.opt:hover {
		color: var(--ink);
	}
	.opt.active {
		color: var(--ink);
		background: var(--bg);
	}
	/* Public = a touch of warm light. */
	.opt.active[aria-pressed='true']:last-child {
		color: var(--accent);
	}
</style>
