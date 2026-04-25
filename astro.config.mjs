import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://briangautreau.com',
  trailingSlash: 'never',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  vite: {
    server: { host: '0.0.0.0' },
  },
});
