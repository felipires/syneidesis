/** Trailing debounce. Returns the wrapped fn plus `.flush()` and `.cancel()`. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, wait = 600) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastArgs: A | undefined;

	const run = (...args: A) => {
		lastArgs = args;
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = undefined;
			if (lastArgs) fn(...lastArgs);
		}, wait);
	};

	run.flush = () => {
		if (timer && lastArgs) {
			clearTimeout(timer);
			timer = undefined;
			fn(...lastArgs);
		}
	};

	run.cancel = () => {
		clearTimeout(timer);
		timer = undefined;
	};

	return run;
}
