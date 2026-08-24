'use client';

import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { GlassCard, GlassButton } from '@/components/ui/GlassPrimitives';

export default function DashboardClient({ displayName }: { displayName: string | null }) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col gap-6 p-4 pb-28">
      <header className="pt-4">
        <p className="text-sm opacity-50">Bon retour,</p>
        <h1 className="text-2xl font-semibold">{displayName ?? 'athlète'}</h1>
      </header>

      <GlassCard clarity="opaque" className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-sm opacity-60">Prêt pour votre prochaine séance ?</p>
        <GlassButton variant="accent" onClick={() => router.push('/workout/new')}>
          <Play className="mr-1.5 h-4 w-4" strokeWidth={2} />
          Démarrer une séance
        </GlassButton>
      </GlassCard>
    </div>
  );
}
