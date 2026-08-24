'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Accent = 'or' | 'argent' | 'bleu' | 'rouge' | 'transparent';
export type Theme = 'light' | 'dark';

const ACCENT_RGB: Record<Exclude<Accent, 'transparent'>, string> = {
  or: '197 165 90',
  argent: '196 196 201',
  bleu: '10 132 255',
  rouge: '255 69 58',
};

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AccentThemeProvider({
  children,
  initialTheme = 'dark',
  initialAccent = 'or',
}: {
  children: ReactNode;
  initialTheme?: Theme;
  initialAccent?: Accent;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [accent, setAccent] = useState<Accent>(initialAccent);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const rgb = accent === 'transparent' ? '255 255 255' : ACCENT_RGB[accent];
    document.documentElement.style.setProperty('--accent-rgb', rgb);
    document.documentElement.classList.toggle('accent-transparent', accent === 'transparent');
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme doit être utilisé à l'intérieur de <AccentThemeProvider>");
  return ctx;
}
