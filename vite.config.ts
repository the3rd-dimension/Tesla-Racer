import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works from any static host / sub-folder.
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
