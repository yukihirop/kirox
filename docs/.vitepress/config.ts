import { defineConfig } from 'vitepress';
import llmstxt, { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms'


// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Kirox',
  description: 'CLI tool to fetch Kiro specification and steering files from remote GitHub repositories',
  base: '/kirox/',
  lang: 'en',

  // Sitemap configuration for SEO
  sitemap: {
    hostname: 'https://yukihirop.github.io/kirox/'
  },

  head: [
    ['meta', { name: 'theme-color', content: '#8544FF' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:title', content: 'Kirox | Recycle .kiro CLI' }],
    ['meta', { property: 'og:image', content: 'https://yukihirop.github.io/kirox/og-image.png' }],
    ['meta', { property: 'og:site_name', content: 'Kirox' }],
    ['meta', { property: 'og:url', content: 'https://yukihirop.github.io/kirox/' }],
  ],

  markdown: {
    lineNumbers: true,
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons);
    }
  },

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.png',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'CLI Reference', link: '/cli/' },
      { text: 'API', link: '/api/' },
      { text: 'Config', link: '/config/' },
      { text: 'LLMs', link: '/llms/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Overview', link: '/guide/' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Basic Usage', link: '/guide/basic-usage' },
            { text: 'Advanced Usage', link: '/guide/advanced-usage' },
            { text: 'Troubleshooting', link: '/guide/troubleshooting' }
          ]
        }
      ],
      '/cli/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'Overview', link: '/cli/' },
            { text: 'kirox', link: '/cli/kirox' },
            { text: 'add', link: '/cli/add' },
            { text: 'completion', link: '/cli/completion' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'API',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'GitHub Fetcher', link: '/api/github-fetcher' },
            { text: 'FileSystem Writer', link: '/api/filesystem-writer' }
          ]
        }
      ],
      '/config/': [
        {
          text: 'Config',
          items: [
            { text: 'Overview', link: '/config/' },
            { text: '.kiroxrc.json', link: '/config/kiroxrc' }
          ]
        }
      ],
      '/llms/': [
        {
          text: 'LLMs',
          items: [
            { text: 'Overview', link: '/llms/' },
            { text: 'LLMs.txt Details', link: '/llms/llms' }
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
    },
  },
  vite: {
    plugins: [llmstxt()],
  }
});
