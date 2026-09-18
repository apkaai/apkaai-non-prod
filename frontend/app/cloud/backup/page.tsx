import type { Metadata } from 'next'
import BackupVendorsClient from './BackupVendorsClient'

export const metadata: Metadata = {
  title: 'Backup & Data Protection Vendors — Compare Commvault, Veeam, Rubrik & More | ApkaAI',
  description: 'Compare top enterprise backup vendors: Commvault, Cohesity, Acronis, Veeam, Dhruva, Veritas/OpenText, and Rubrik. Pricing, features, and platform support.',
  alternates: { canonical: 'https://apkaai.com/cloud/backup' },
}

export default function BackupVendorsPage() {
  return <BackupVendorsClient />
}
