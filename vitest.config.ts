import { defineConfig } from 'vitest/config';

/**
 * Unit tests run in plain Node (no SvelteKit plugin) — they cover pure helpers
 * and server-only logic that relies on WebCrypto, which Node 22 provides.
 * Component tests, if added later, would need the svelte plugin + jsdom.
 */
export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts']
	}
});
