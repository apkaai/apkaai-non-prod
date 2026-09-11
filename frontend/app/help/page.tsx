import type { Metadata } from 'next'
import HelpClient from './HelpClient'

export const metadata: Metadata = {
  title: 'Help Center — ApkaAI FAQ & Support',
  description: 'Find answers to common questions about ApkaAI — how to list an AI tool, pricing accuracy, the comparison tool, and how to contact us for support.',
  alternates: { canonical: 'https://apkaai.com/help' },
}

export default function HelpPage() {
  return <HelpClient />
}
