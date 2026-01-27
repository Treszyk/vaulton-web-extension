import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	plugins: [
		angular({
			tsconfig: './tsconfig.json',
			jit: false,
		}),
	],
	base: './',
	build: {
		outDir: 'dist',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				popup: resolve(__dirname, 'src/popup/index.html'),
				service_worker: resolve(__dirname, 'src/background/main.ts'),
			},
			output: {
				entryFileNames: (chunkInfo) => {
					if (chunkInfo.name === 'service_worker') {
						return 'service-worker.js';
					}
					return 'assets/[name]-[hash].js';
				},
			},
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
});
