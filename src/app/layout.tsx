import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dashboard Aset Tetap Daerah | DJPK Kemendagri',
  description: 'Dashboard Monitoring Aset Tetap Pemerintah Daerah',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
