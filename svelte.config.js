import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Fully prerendered static site (see src/routes/+layout.ts).
 * adapter-static emits plain files that Cloudflare Pages serves directly.
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// Emit a styled 404.html (served by Cloudflare Pages on unmatched routes).
			fallback: '404.html',
			precompress: false,
			strict: true
		})
	}
};

export default config;
