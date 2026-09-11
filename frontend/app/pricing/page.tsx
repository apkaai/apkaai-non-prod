import type { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'AI Tool Pricing in India (INR) — Compare Plans | ApkaAI',
  description: 'Compare AI tool pricing in Indian Rupees. Find free AI tools, freemium plans, and paid subscriptions for ChatGPT, Midjourney, Cursor, and 70+ more.',
  alternates: { canonical: 'https://apkaai.com/pricing' },
}

export default function PricingPage() {
  return <PricingClient />
}
