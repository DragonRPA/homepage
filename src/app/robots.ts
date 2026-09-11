import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
          'Amazonbot',
          'CCBot',
          'Bytespider',
          'cohere-ai',
          'Googlebot',
          'Bingbot',
        ],
        allow: '/',
      },
    ],
    sitemap: 'https://www.dragonrpa.co.kr/sitemap.xml',
  };
}
