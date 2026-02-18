import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quiz Platform – Fredens Akademi',
  description: 'Opret og administrer quizzer med proportional delvis kredit',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
