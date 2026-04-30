import { defineConfig } from 'wxt';

// https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  outDir: '.output',
  manifest: {
    name: 'Freedom of Speech',
    description: 'Decentralized comments on every webpage. One human, one account, no bans.',
    version: '0.0.1',
    permissions: ['storage', 'activeTab', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Freedom of Speech',
    },
    web_accessible_resources: [
      {
        resources: ['icon/*.png'],
        matches: ['<all_urls>'],
      },
    ],
  },
  vite: () => ({
    css: {
      postcss: './postcss.config.cjs',
    },
  }),
});
