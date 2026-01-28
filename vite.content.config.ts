import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: false,
		lib: {
			entry: resolve(__dirname, 'src/content/main.ts'),
			name: 'VaultonContent',
			formats: ['iife'],
			fileName: () => 'content.js',
		},
		rollupOptions: {
			output: {
				extend: true,
			},
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
});
