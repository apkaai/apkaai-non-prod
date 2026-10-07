import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/dashboard',
          '/orders',
          '/profile',
          '/wishlist',
          '/referral',
          '/signin',
          '/signup',
          '/reset-password',
          '/forgot-password',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/api/'],
      },
    ],
    sitemap: 'https://apkaai.com/sitemap.xml',
    host:    'https://apkaai.com',
  }
}
