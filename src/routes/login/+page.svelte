<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Sign in · Syneidesis</title></svelte:head>

<section class="login measure">
	<h1>Syneidesis</h1>
	<p class="lede">A quiet place to write.</p>
	<form method="POST" use:enhance>
		<input
			type="password"
			name="password"
			placeholder="Password"
			autocomplete="current-password"
			aria-label="Password"
		/>
		<button type="submit">Enter</button>
		{#if form?.error}<p class="err meta">That password isn’t right.</p>{/if}
	</form>
</section>

<style>
	.login {
		padding: clamp(var(--s-16), 22vh, var(--s-24)) var(--s-6);
		text-align: center;
	}
	h1 {
		font-size: 2rem;
		font-weight: 500;
	}
	.lede {
		margin-top: var(--s-2);
		color: var(--muted);
	}
	form {
		margin-top: var(--s-8);
		display: flex;
		flex-direction: column;
		gap: var(--s-3);
		max-width: 18rem;
		margin-inline: auto;
	}
	input {
		padding: var(--s-3);
		border: 1px solid var(--hairline);
		border-radius: var(--radius-control);
		background: var(--bg);
		color: var(--ink);
		font-family: var(--font-serif);
		font-size: 1rem;
	}
	input:focus {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	button {
		padding: var(--s-3);
		border: none;
		border-radius: var(--radius-control);
		background: var(--primary);
		color: var(--primary-ink);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		cursor: pointer;
	}
	.err {
		color: var(--danger);
	}
</style>
