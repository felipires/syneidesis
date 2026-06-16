/* Small cross-component UI state. Zen mode lives here so the editor can enter it
   while the layout's TopBar reacts (lifts away). Zen also takes the browser
   full-screen for a truly distraction-free surface. */

class UiStore {
	zen = $state(false);

	async enterZen() {
		this.zen = true;
		// Called from a click handler, so the gesture is valid. Fullscreen is a
		// nicety — if it's blocked (iframe, permissions), Zen still works visually.
		try {
			if (typeof document !== 'undefined' && !document.fullscreenElement) {
				await document.documentElement.requestFullscreen();
			}
		} catch {
			/* ignore */
		}
	}

	async exitZen() {
		this.zen = false;
		try {
			if (typeof document !== 'undefined' && document.fullscreenElement) {
				await document.exitFullscreen();
			}
		} catch {
			/* ignore */
		}
	}

	toggleZen() {
		if (this.zen) this.exitZen();
		else this.enterZen();
	}

	/** Keep Zen in sync when the user leaves full-screen via Esc / F11 / browser UI.
	    Returns a cleanup function. Call once on the client. */
	bindFullscreen() {
		if (typeof document === 'undefined') return () => {};
		const onChange = () => {
			if (!document.fullscreenElement && this.zen) this.zen = false;
		};
		document.addEventListener('fullscreenchange', onChange);
		return () => document.removeEventListener('fullscreenchange', onChange);
	}
}

export const ui = new UiStore();
