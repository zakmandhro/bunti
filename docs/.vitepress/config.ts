import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Bunti',
  description:
    'A Bun-native, zero-dependency terminal UI engine with live themes, 10,763 Nerd Font icons, mouse & motion — designed so coding agents write it fluently.',
  base: '/bunti/',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Reference', link: '/engine' },
      { text: 'For Agents', link: '/for-agents' },
      { text: 'npm', link: 'https://www.npmjs.com/package/@zakmandhro/bunti' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Box Model & Layout', link: '/layout' },
          { text: 'Components', link: '/components' },
          { text: 'Theming', link: '/theming' },
          { text: 'Icons & Nerd Fonts', link: '/icons' },
          { text: 'Input & Mouse', link: '/input-and-mouse' },
          { text: 'Animation & Motion', link: '/animations' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Engine & Lifecycle', link: '/engine' },
          { text: 'Terminal Support', link: '/terminal-support' },
          { text: 'Bunti vs Ecosystem', link: '/comparison' },
        ],
      },
      {
        text: 'For Agents',
        items: [{ text: 'Building with Agents', link: '/for-agents' }],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/zakmandhro/bunti' }],

    editLink: {
      pattern: 'https://github.com/zakmandhro/bunti/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Zak Mandhro',
    },
  },
});
