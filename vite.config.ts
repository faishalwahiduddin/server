import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		port: 3036,
		strictPort: true,
		watch: { ignored: ['**/.svelte-kit/cloudflare/**', '**/.svelte-kit/output/**'] }
	},
	test: {
		maxWorkers: 4,
		projects: [
			{
				extends: true,
				test: {
					name: 'server',
					include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
					exclude: ['src/**/*.svelte.test.ts'],
					environment: 'node'
				}
			},
			{
				extends: true,
				resolve: { conditions: ['browser'] },
				test: { name: 'client', include: ['src/**/*.svelte.test.ts'], environment: 'jsdom' }
			}
		]
	}
});
