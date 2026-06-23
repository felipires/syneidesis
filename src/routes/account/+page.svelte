<script lang="ts">
	import { startRegistration } from '@simplewebauthn/browser';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let msg = $state('');

	async function enroll() {
		msg = '';
		try {
			const optionsJSON = await (await fetch('/api/passkey/register')).json();
			const resp = await startRegistration({ optionsJSON });
			const r = await fetch('/api/passkey/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(resp)
			});
			if (r.ok) {
				msg = 'This device can now unlock Syneidesis.';
				await invalidateAll();
			} else {
				msg = 'Couldn’t register this device.';
			}
		} catch {
			msg = 'Registration was cancelled.';
		}
	}
</script>

<svelte:head><title>Account · Syneidesis</title></svelte:head>

<section class="account measure">
	<h1>Account</h1>

	<div class="block">
		<h2>This device</h2>
		<p class="note">
			Register Windows Hello (face / fingerprint) or a passkey so you can unlock without the
			password. {data.hasPasskeys ? 'At least one device is registered.' : 'No devices registered yet.'}
		</p>
		<button class="primary" type="button" onclick={enroll}>Add this device</button>
		{#if msg}<p class="msg meta">{msg}</p>{/if}
	</div>

	<form method="POST" action="?/logout" class="block">
		<button class="ghost" type="submit">Sign out</button>
	</form>

	<a class="back meta" href="/">← back</a>
</section>

<style>
	.account {
		padding: var(--s-12) var(--s-6) var(--s-24);
	}
	h1 {
		font-size: 2rem;
		font-weight: 500;
	}
	.block {
		margin-top: var(--s-12);
	}
	h2 {
		font-size: 1.25rem;
		font-weight: 500;
	}
	.note {
		margin: var(--s-3) 0 var(--s-4);
		color: var(--muted);
		line-height: 1.6;
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
	}
	.ghost {
		padding: var(--s-2) var(--s-4);
		border: 1px solid var(--hairline);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--muted);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		cursor: pointer;
	}
	.ghost:hover {
		color: var(--ink);
	}
	.msg {
		margin-top: var(--s-3);
		color: var(--accent);
	}
	.back {
		display: inline-block;
		margin-top: var(--s-16);
		color: var(--muted);
	}
</style>
