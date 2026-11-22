import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#F6FAFD',
};

export const metadata: Metadata = {
  title: 'Engel | Cuidado que escuta',
  description:
    'Uma conversa acolhedora para organizar relatos de possíveis reações a medicamentos.',
  icons: {
    icon: [{ url: '/engel-mark.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
