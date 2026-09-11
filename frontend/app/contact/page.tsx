import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact ApkaAI — Get in Touch with Us',
  description:
    'Have questions, partnership enquiries, or want to list your AI tool? Contact Ashutosh Kumar Pandey at ApkaAI — we reply to every message within 24 hours.',
  alternates: { canonical: 'https://apkaai.com/contact' },
}

export default function ContactPage() {
  return <ContactClient />
}
