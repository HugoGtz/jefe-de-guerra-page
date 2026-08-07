import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Unit tests run in plain Node (no SvelteKit plugin) — they cover pure helpers
 * and server-only logic that relies on WebCrypto, which Node 22 provides.
 * The `$lib` alias is wired manually so server modules resolve without the
 * full SvelteKit build. Component tests, if added later, would need the svelte
 * plugin + jsdom.
 */
export default defineConfig({
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts']
	}
});
