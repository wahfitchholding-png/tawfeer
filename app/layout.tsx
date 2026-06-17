import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PriceDrop — Cheapest Delivery in Dubai',
  description: 'Compare Talabat, Deliveroo, Careem and Keeta prices for the same restaurant. Always order at the lowest price.',
  keywords: ['food delivery', 'Dubai', 'Talabat', 'Deliveroo', 'Careem', 'Keeta', 'price comparison'],
}

export const viewport: Viewport = {
  themeColor: '#FF6B00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen max-w-md mx-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
