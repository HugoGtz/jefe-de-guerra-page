import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * SSR on Cloudflare (Pages, advanced mode). Pages reads guild data from D1 at
 * request time, so the site is server-rendered (not prerendered).
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter()
	}
};

export default config;
