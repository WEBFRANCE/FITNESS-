'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, Clock, Activity, MessageCircle, Settings } from 'lucide-react';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { href: '/dashboard', icon: Dumbbell, label: 'Séance' },
  { href: '/history', icon: Clock, label: 'Historique' },
  { href: '/body', icon: Activity, label: 'Corps' },
  { href: '/coach', icon: MessageCircle, label: 'Coach' },
  { href: '/settings', icon: Settings, label: 'Réglages' },
] as const;

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {children}

      <nav
        className="glass fixed inset-x-4 bottom-4 z-30 flex items-center justify-around rounded-full px-2 py-2"
        data-clarity="opaque"
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-full px-4 py-1.5 text-[10px] transition-colors ${
                active ? 'text-accent' : 'opacity-50'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
