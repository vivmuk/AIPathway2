import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AI Pathway 2 - Upskill for Any Job with AI',
  description: 'Upskill yourself for any job by learning to apply AI to the requirements. Transform job descriptions or internal workflows into comprehensive AI learning paths.',
  keywords: ['AI education', 'AI Pathway', 'upskilling', 'job training', 'AI skills', 'career development'],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
