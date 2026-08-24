import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AccentThemeProvider } from '@/components/ui/AccentThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Masterclass',
  description: 'Musculation, très haut de gamme, cercle privé.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0b0b0d',
  viewportFit: 'cover',
};

// suppressHydrationWarning : data-theme est posé côté client par
// AccentThemeProvider (useEffect, donc après l'hydratation) — sans ça React
// signale un mismatch. Ça n'élimine pas le flash d'un demi-frame au premier
// chargement ; pour l'éliminer complètement, ajouter un <script> inline
// synchrone dans <head> qui lit un cookie/localStorage et pose data-theme
// AVANT l'hydratation (pattern classique, omis ici pour rester focus).
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AccentThemeProvider>{children}</AccentThemeProvider>
      </body>
    </html>
  );
}
