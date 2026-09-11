import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'ApkaAI — Discover & Buy the Best AI Tools',
  description: 'Your one-stop marketplace for AI tools — ChatGPT, Claude, Midjourney, Cursor, and 43 more. Find, compare and get the best AI subscriptions.',
  keywords: 'AI tools, ChatGPT, Claude, Midjourney, Cursor, AI marketplace, buy AI subscriptions',
  openGraph: {
    title: 'ApkaAI — Discover & Buy the Best AI Tools',
    description: 'Your one-stop marketplace for AI tools',
    url: 'https://apkaai.com',
    siteName: 'ApkaAI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ApkaAI — Discover & Buy the Best AI Tools',
    description: 'Your one-stop marketplace for AI tools',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-[#08051A] text-slate-100 antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
