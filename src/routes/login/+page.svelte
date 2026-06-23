<script lang="ts">
	import { enhance } from '$app/forms';
	import { startAuthentication } from '@simplewebauthn/browser';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let passkeyError = $state(false);

	async function signInWithPasskey() {
		passkeyError = false;
		try {
			const optionsJSON = await (await fetch('/api/passkey/auth')).json();
			const resp = await startAuthentication({ optionsJSON });
			const r = await fetch('/api/passkey/auth', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(resp)
			});
			if (r.ok) location.href = '/';
			else passkeyError = true;
		} catch {
			passkeyError = true; // cancelled or failed
		}
	}
</script>

<svelte:head><title>Sign in · Syneidesis</title></svelte:head>

<section class="login measure">
	<h1>Syneidesis</h1>
	<p class="lede">A quiet place to write.</p>

	{#if data.hasPasskeys}
		<!-- Passkey enrolled → password sign-in is disabled; only your device unlocks. -->
		<button class="hello" type="button" onclick={signInWithPasskey}>Unlock with my device</button>
		{#if passkeyError}<p class="err meta">Couldn’t verify your device.</p>{/if}
	{:else}
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
	{/if}
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
	.hello {
		margin: var(--s-8) auto 0;
		display: block;
		max-width: 18rem;
		width: 100%;
		padding: var(--s-3);
		border: 1px solid var(--hairline);
		border-radius: var(--radius-control);
		background: var(--surface);
		color: var(--ink);
		font-family: var(--font-mono);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color var(--dur-fast) var(--ease-out);
	}
	.hello:hover {
		border-color: var(--accent);
	}
	form {
		margin-top: var(--s-4);
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
