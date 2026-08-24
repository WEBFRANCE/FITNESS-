'use client';

import { useEffect, useState } from 'react';
import { computeWrappedStats, type WrappedStats } from '@/lib/utils/computeWrappedStats';
import WrappedCard from '@/components/wrapped/WrappedCard';

export default function WrappedPageClient({ userId }: { userId: string }) {
  const [stats, setStats] = useState<WrappedStats | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const label = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    void computeWrappedStats(userId, from, to, label).then(setStats);
  }, [userId]);

  if (!stats) {
    return <p className="px-5 pt-10 text-center text-sm opacity-40">Calcul en cours…</p>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <WrappedCard stats={stats} />
    </div>
  );
}
