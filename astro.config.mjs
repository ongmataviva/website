import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  outDir: 'dist',
  publicDir: 'public',
  site: 'https://ongmataviva.pages.dev',
  // Portas dedicadas do Mata Viva, fora da faixa 432x/517x usada por outros
  // projetos desta máquina. host:true permite testar o PWA em celular na LAN.
  server: { port: 4545, host: true },
  preview: { port: 4545 },
  build: {
    format: 'directory',
  },
  vite: {
    ssr: {
      noExternal: ['cookie'],
    },
  },
});