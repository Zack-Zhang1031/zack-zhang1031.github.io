import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://zackzhang.dev',
  output: 'static',
  adapter: vercel(),
  integrations: [tailwind(), sitemap()],
});
