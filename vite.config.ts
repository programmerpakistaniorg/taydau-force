import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: [
        '**/docs/**',
        '**/scratch/**',
        '**/.git/**',
        '**/*.pdf',
        '**/*.zip',
        '**/*.rar',
        '**/*.7z',
        '**/*.tar*',
        '**/*.gz',
        '**/*.iso',
        '**/*.tmp',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
