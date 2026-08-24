'use client';

import { useEffect, useState } from 'react';
import { computeMuscleVolumes } from '@/lib/utils/computeMuscleVolumes';
import HeatmapModel3D, { type MuscleVolume } from '@/components/body/HeatmapModel3D';
import PhysiqueAnalysis from '@/components/body/PhysiqueAnalysis';

export default function BodyPageClient({ userId }: { userId: string }) {
  const [volumes, setVolumes] = useState<MuscleVolume[] | null>(null);

  useEffect(() => {
    void computeMuscleVolumes(userId, 7).then(setVolumes);
  }, [userId]);

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 pb-28">
      <header className="pt-4">
        <h1 className="text-lg font-semibold">Bilan musculaire</h1>
        <p className="text-sm opacity-50">Volume des 7 derniers jours</p>
      </header>

      {volumes ? (
        <HeatmapModel3D volumes={volumes} />
      ) : (
        <p className="pt-10 text-center text-sm opacity-40">Calcul en cours…</p>
      )}

      <PhysiqueAnalysis />
    </div>
  );
}
