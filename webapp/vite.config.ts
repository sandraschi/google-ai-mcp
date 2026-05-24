import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 11015,
    proxy: {
      '/api': 'http://127.0.0.1:11014',
      '/mcp': 'http://127.0.0.1:11014',
      '/ws': {
        target: 'ws://127.0.0.1:11014',
        ws: true,
      },
    },
  },
});
