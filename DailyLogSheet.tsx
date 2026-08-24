'use client';

import { useEffect, useState } from 'react';
import { GlassSheet, GlassButton } from '@/components/ui/GlassPrimitives';
import { useDailyLogStore } from '@/lib/store/dailyLogStore';

export interface ActiveModules {
  nutrition: boolean;
  sleep: boolean;
  fatigue: boolean;
  measurements: boolean;
}

export default function DailyLogSheet({
  open,
  onClose,
  userId,
  activeModules,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  activeModules: ActiveModules;
}) {
  const log = useDailyLogStore((s) => s.log);
  const loadToday = useDailyLogStore((s) => s.loadToday);
  const updateSleep = useDailyLogStore((s) => s.updateSleep);
  const updateFatigue = useDailyLogStore((s) => s.updateFatigue);
  const updateNutrition = useDailyLogStore((s) => s.updateNutrition);

  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [calories, setCalories] = useState(0);
  const [proteinG, setProteinG] = useState(0);

  useEffect(() => {
    if (open) void loadToday(userId);
  }, [open, userId, loadToday]);

  // useState() ne lit sa valeur initiale qu'au premier rendu : sans cet
  // effet, les champs resteraient sur leurs défauts même après le chargement
  // asynchrone d'un journal déjà existant pour aujourd'hui.
  useEffect(() => {
    if (!log) return;
    setSleepHours(log.sleepHours ?? 7);
    setSleepQuality(log.sleepQuality ?? 3);
    setFatigue(log.fatigueLevel ?? 3);
    setCalories(log.nutrition?.calories ?? 0);
    setProteinG(log.nutrition?.proteinG ?? 0);
  }, [log?.id]);

  return (
    <GlassSheet open={open} onClose={onClose} title="Journal du jour">
      <div className="flex flex-col gap-6">
        {activeModules.sleep && (
          <section>
            <h3 className="mb-2 text-sm font-medium opacity-70">Sommeil</h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="w-14 text-right tabular-nums">{sleepHours}h</span>
            </div>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSleepQuality(q)}
                  className={`h-8 flex-1 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                    sleepQuality === q ? 'bg-accent text-black' : 'bg-white/[0.04]'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        )}

        {activeModules.fatigue && (
          <section>
            <h3 className="mb-2 text-sm font-medium opacity-70">Niveau de fatigue</h3>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFatigue(f)}
                  className={`h-9 flex-1 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                    fatigue === f ? 'bg-accent text-black' : 'bg-white/[0.04]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </section>
        )}

        {activeModules.nutrition && (
          <section>
            <h3 className="mb-2 text-sm font-medium opacity-70">Nutrition</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-xs opacity-60">
                Calories
                <input
                  type="number"
                  inputMode="numeric"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  className="rounded-xl bg-white/[0.04] px-3 py-2 text-base text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs opacity-60">
                Protéines (g)
                <input
                  type="number"
                  inputMode="numeric"
                  value={proteinG}
                  onChange={(e) => setProteinG(Number(e.target.value))}
                  className="rounded-xl bg-white/[0.04] px-3 py-2 text-base text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                />
              </label>
            </div>
          </section>
        )}

        <GlassButton
          variant="accent"
          onClick={async () => {
            if (activeModules.sleep) await updateSleep(sleepHours, sleepQuality);
            if (activeModules.fatigue) await updateFatigue(fatigue);
            if (activeModules.nutrition) await updateNutrition({ calories, proteinG });
            onClose();
          }}
        >
          Enregistrer
        </GlassButton>
      </div>
    </GlassSheet>
  );
}
