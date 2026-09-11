import type { Metadata } from 'next'
import { tools, categories } from '@/lib/tools-data'
import ToolsClient from './ToolsClient'

export const metadata: Metadata = {
  title: `All ${tools.length}+ AI Tools — Browse & Filter | ApkaAI`,
  description: `Browse all ${tools.length}+ hand-picked AI tools across ${categories.length} categories. Filter by pricing, sort by rating, and find the perfect AI for your workflow.`,
  alternates: { canonical: 'https://apkaai.com/tools' },
}

export default function ToolsPage() {
  return <ToolsClient />
}
