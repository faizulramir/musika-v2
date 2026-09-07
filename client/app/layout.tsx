import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Musika — Guess the Song, Fast',
  description: 'A fast-paced multiplayer music trivia game. Faster answers, higher score.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-display">{children}</body>
    </html>
  );
}
