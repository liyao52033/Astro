import { defineConfig } from 'astro/config';
 import { RemarkPlugin } from './remark-plugin.mjs';
import preact from "@astrojs/preact";

export default defineConfig({
  site: "https://astro-e88d55.netlify.app",
  integrations: [preact()],
  markdown: {
    remarkPlugins: [RemarkPlugin]
  },
});