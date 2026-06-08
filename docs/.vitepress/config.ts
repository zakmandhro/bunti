import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Bunti',
  description: 'A high-performance, functional TUI engine built specifically for Bun.',
  base: '/bunti/', // Typically needed for GitHub Pages if repo name is bunti
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Documentation', link: '/layout' },
    ],

    sidebar: [
      {
        text: 'Architecture & Engine',
        items: [
          { text: 'Box Model & Math', link: '/layout' },
          { text: 'Components & Primitives', link: '/components' },
          { text: 'Theming & Colors', link: '/theming' },
          { text: 'Animations & Canvas', link: '/animations' },
          { text: 'Engine & Utilities', link: '/engine' },
          { text: 'Bunti vs Ecosystem', link: '/comparison' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/zak/bunti' }, // Update with correct repo later
    ],
  },
});
