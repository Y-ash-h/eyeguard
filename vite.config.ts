import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // When deploying to GitHub Pages at https://Y-ash-h.github.io/eyeguard/
  // the base must match the repository name.
  base: '/eyeguard/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
