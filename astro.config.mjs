import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://zz1031.zz1031.workers.dev',
  output: 'static',
  adapter: vercel(),
  integrations: [tailwind(), sitemap()],
});
