import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { ViteUserConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react() as ViteUserConfig['plugins']],
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
