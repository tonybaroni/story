import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Swim Recruiting Tracker',
  description: 'NCAA Transfer Portal Recruiting Tracker',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <nav className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏊</span>
            <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-90">
              Swim Recruiting Tracker
            </Link>
          </div>
          <Link
            href="/schools/new"
            className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition"
          >
            + Add School
          </Link>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
