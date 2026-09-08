import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FloatingSocialWidget from '@/components/FloatingSocialWidget'
import AIChatbot from '@/components/AIChatbot'

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
        {/* Fixed widget bar — chatbot LEFT, social widget RIGHT, side by side */}
        <div className="fixed bottom-6 right-5 z-[9999] flex flex-row items-end gap-3">
          <AIChatbot />
          <FloatingSocialWidget />
        </div>
      </body>
    </html>
  )
}
