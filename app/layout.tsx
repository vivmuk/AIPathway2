import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GenAI Course Creator - Personalized AI Education',
  description: 'Create personalized, comprehensive AI education courses tailored to specific job roles using Venice AI',
  keywords: ['AI education', 'GenAI', 'course creator', 'personalized learning', 'Venice AI'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
