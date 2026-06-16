/* Small cross-component UI state. Zen mode lives here so the editor can enter it
   while the layout's TopBar reacts (lifts away). */

class UiStore {
	zen = $state(false);

	toggleZen() {
		this.zen = !this.zen;
	}

	exitZen() {
		this.zen = false;
	}
}

export const ui = new UiStore();
