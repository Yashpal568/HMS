import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@hms/types': resolve(__dirname, '../../packages/types/index.ts'),
      'puppeteer-core': 'C:/Users/hp/.gemini/antigravity-ide/brain/8f2c8318-3abe-4958-af28-796f041209de/scratch/crawler/node_modules/puppeteer-core',
    },
  },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts', '../../tests/e2e/opd/**/*.spec.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
