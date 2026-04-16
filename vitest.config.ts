import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
      'runtime/**',
      '.wt/**',
      '**/.wt/**',
    ],
  },
});
