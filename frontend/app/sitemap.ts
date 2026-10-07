import { MetadataRoute } from 'next'
import { tools, categories } from '@/lib/tools-data'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://apkaai.com'
  const now  = new Date()

  // Static pages
  const staticPages = [
    { url: base,              lastModified: now, changeFrequency: 'weekly'  as const, priority: 1.0 },
    { url: `${base}/tools`,   lastModified: now, changeFrequency: 'daily'   as const, priority: 0.9 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: 'weekly'  as const, priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'weekly'  as const, priority: 0.8 },
    { url: `${base}/cloud`,   lastModified: now, changeFrequency: 'weekly'  as const, priority: 0.8 },
    { url: `${base}/demo`,    lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${base}/blog`,    lastModified: now, changeFrequency: 'daily'   as const, priority: 0.7 },
    { url: `${base}/about`,   lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${base}/careers`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly'  as const, priority: 0.3 },
    { url: `${base}/terms`,   lastModified: now, changeFrequency: 'yearly'  as const, priority: 0.3 },
  ]

  // Tool pages
  const toolPages = tools.map(tool => ({
    url:              `${base}/tools/${tool.slug}`,
    lastModified:     now,
    changeFrequency:  'weekly' as const,
    priority:         0.8,
  }))

  // Tool deals pages
  const dealPages = tools.map(tool => ({
    url:              `${base}/deals/${tool.slug}`,
    lastModified:     now,
    changeFrequency:  'weekly' as const,
    priority:         0.6,
  }))

  // Category pages
  const categoryPages = categories.map(cat => ({
    url:              `${base}/category/${cat.slug}`,
    lastModified:     now,
    changeFrequency:  'weekly' as const,
    priority:         0.7,
  }))

  return [...staticPages, ...toolPages, ...dealPages, ...categoryPages]
}
