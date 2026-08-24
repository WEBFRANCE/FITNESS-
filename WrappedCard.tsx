'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Trophy, Flame, Dumbbell } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { WrappedStats } from '@/lib/utils/computeWrappedStats';

// npm install html-to-image
//
// ⚠️ Le backdrop-filter (notre .glass) est capturé de façon inégale par les
// librairies DOM→image, html-to-image inclus : elle sérialise le DOM en SVG
// avant rasterisation, et le flou d'arrière-plan dépend de ce qu'il y a
// "derrière" en rendu live, difficile à répliquer hors de ce contexte.
// data-clarity="opaque" ci-dessous limite volontairement la dépendance au
// flou pour CETTE carte précisément. Testez sur vos appareils cibles avant
// de livrer ; repli possible sur un rendu serveur (Satori / @vercel/og) si
// le résultat n'est pas fiable partout.
export default function WrappedCard({ stats }: { stats: WrappedStats }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportAsImage() {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const link = document.createElement('a');
      link.download = `wrapped-${stats.period}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        ref={cardRef}
        className="glass relative w-full max-w-sm overflow-hidden rounded-glass p-8"
        data-clarity="opaque"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: 'rgb(var(--accent-rgb))' }}
        />

        <p className="text-xs uppercase tracking-[0.2em] opacity-50">Wrapped</p>
        <h2 className="mt-1 text-2xl font-semibold">{stats.period}</h2>

        <div className="mt-8 grid grid-cols-2 gap-6">
          <Stat icon={<Dumbbell className="h-5 w-5" strokeWidth={1.5} />} value={stats.sessionsCount} label="séances" />
          <Stat
            icon={<Flame className="h-5 w-5" strokeWidth={1.5} />}
            value={`${(stats.totalVolumeKg / 1000).toFixed(1)}t`}
            label="volume soulevé"
          />
          <Stat icon={<Trophy className="h-5 w-5" strokeWidth={1.5} />} value={stats.prCount} label="records battus" />
          <Stat value={`${Math.round(stats.totalDurationMinutes / 60)}h`} label="temps total" />
        </div>

        {stats.topExercise && (
          <p className="mt-8 text-sm opacity-60">
            Exercice le plus pratiqué : <span className="text-accent">{stats.topExercise.name}</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={exportAsImage}
        disabled={exporting}
        className="glass rounded-full px-6 py-2.5 text-sm font-medium disabled:opacity-40"
      >
        {exporting ? 'Export…' : 'Exporter en image'}
      </button>
    </div>
  );
}

function Stat({ icon, value, label }: { icon?: ReactNode; value: string | number; label: string }) {
  return (
    <div>
      {icon && <div className="mb-1 text-accent">{icon}</div>}
      <p className="text-3xl font-light tabular-nums">{value}</p>
      <p className="text-xs opacity-50">{label}</p>
    </div>
  );
}
