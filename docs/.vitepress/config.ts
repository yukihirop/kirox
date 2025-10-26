import { defineConfig } from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Kirox',
  description: 'CLI tool to fetch Kiro specification and steering files from remote GitHub repositories',
  base: '/kirox/',
  lang: 'ja-JP',

  // Sitemap configuration for SEO
  sitemap: {
    hostname: 'https://yukihirop.github.io/kirox/'
  },

  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  markdown: {
    lineNumbers: true
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',

    nav: [
      { text: 'ガイド', link: '/guide/' },
      { text: 'CLI リファレンス', link: '/cli/' },
      { text: 'API 仕様', link: '/api/' },
      { text: '設定', link: '/config/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'ガイド',
          items: [
            { text: '概要', link: '/guide/' },
            { text: 'はじめに', link: '/guide/getting-started' },
            { text: '基本的な使い方', link: '/guide/basic-usage' },
            { text: '高度な使い方', link: '/guide/advanced-usage' },
            { text: 'トラブルシューティング', link: '/guide/troubleshooting' }
          ]
        }
      ],
      '/cli/': [
        {
          text: 'CLI リファレンス',
          items: [
            { text: '概要', link: '/cli/' },
            { text: 'kirox', link: '/cli/kirox' },
            { text: 'add', link: '/cli/add' },
            { text: 'completion', link: '/cli/completion' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 仕様',
          items: [
            { text: '概要', link: '/api/' },
            { text: 'GitHub Fetcher', link: '/api/github-fetcher' },
            { text: 'FileSystem Writer', link: '/api/filesystem-writer' }
          ]
        }
      ],
      '/config/': [
        {
          text: '設定',
          items: [
            { text: '概要', link: '/config/' },
            { text: '.kiroxrc.json', link: '/config/kiroxrc' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/yukihirop/kirox' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present yukihirop'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3]
    }
  }
});
