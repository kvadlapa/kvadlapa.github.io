import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kvadlapa.github.io',
  output: 'static',
  // OUT_DIR lets the fixture and resilience builds avoid touching dist/.
  outDir: process.env.OUT_DIR ?? './dist',
  build: { inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
