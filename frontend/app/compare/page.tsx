import type { Metadata } from 'next'
import { tools } from '@/lib/tools-data'
import CompareClient from './CompareClient'

export const metadata: Metadata = {
  title: `Compare AI Tools Side by Side — ${tools.length}+ Tools | ApkaAI`,
  description: `Compare up to 4 AI tools side by side on pricing, features, and ratings. ${tools.length}+ AI tools available — ChatGPT vs Claude, Midjourney vs DALL-E, and more.`,
  alternates: { canonical: 'https://apkaai.com/compare' },
}

export default function ComparePage() {
  return <CompareClient />
}
