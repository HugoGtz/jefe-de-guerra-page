import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const inDocker = process.env.DOCKER === 'true';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: true,
		port: 5173,
		// Bind mounts on macOS don't reliably emit fs events; poll inside Docker.
		watch: inDocker ? { usePolling: true, interval: 100 } : undefined
	}
});
