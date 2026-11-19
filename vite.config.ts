import { defineConfig } from 'vite';

export default defineConfig({
  // Relative Pfade, damit der Build unter https://<user>.github.io/<repo>/ läuft
  base: './',
  build: {
    // Three.js allein ist ~600 kB; Code-Splitting lohnt sich erst bei mehr App-Code (YAGNI)
    chunkSizeWarningLimit: 1000,
  },
});
