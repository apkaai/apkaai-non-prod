import type { Metadata } from 'next'
import CartPageClient from './CartPageClient'

export const metadata: Metadata = {
  title: 'Your Cart — ApkaAI',
  description: 'Review your selected AI tools and plans before checkout.',
}

export default function CartPage() {
  return <CartPageClient />
}
