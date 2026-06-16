/* Theme state for Syneidesis — "day" (paper), "night" (lamplight), or "auto"
   (follow the OS). The effective theme is written to <html data-theme> so the
   token overrides in tokens.css apply. An inline script in app.html sets it
   before first paint to avoid a flash; this store keeps it in sync after hydration. */

export type ThemeMode = 'day' | 'night' | 'auto';
export type EffectiveTheme = 'day' | 'night';

const STORAGE_KEY = 'syn-theme';

function systemTheme(): EffectiveTheme {
	if (typeof window === 'undefined') return 'day';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

function resolve(mode: ThemeMode): EffectiveTheme {
	return mode === 'auto' ? systemTheme() : mode;
}

function readStored(): ThemeMode {
	if (typeof localStorage === 'undefined') return 'auto';
	const v = localStorage.getItem(STORAGE_KEY);
	return v === 'day' || v === 'night' || v === 'auto' ? v : 'auto';
}

class ThemeStore {
	mode = $state<ThemeMode>('auto');
	effective = $state<EffectiveTheme>('day');

	/** Call once on the client (e.g. from the root layout) to hydrate + bind. */
	init() {
		this.mode = readStored();
		this.apply();

		// React to OS changes only while in auto mode.
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', () => {
			if (this.mode === 'auto') this.apply();
		});
	}

	private apply() {
		this.effective = resolve(this.mode);
		document.documentElement.dataset.theme = this.effective;
	}

	set(mode: ThemeMode) {
		this.mode = mode;
		localStorage.setItem(STORAGE_KEY, mode);
		this.apply();
	}

	/** Quick toggle between the two visible themes (used by the top-bar sun/moon). */
	toggle() {
		this.set(this.effective === 'night' ? 'day' : 'night');
	}
}

export const theme = new ThemeStore();
