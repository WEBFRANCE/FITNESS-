'use client';

import { useTheme } from '@/components/ui/AccentThemeProvider';
import { GlassCard } from '@/components/ui/GlassPrimitives';

const ACCENT_OPTIONS: { value: 'or' | 'argent' | 'bleu' | 'rouge' | 'transparent'; label: string; swatch: string }[] = [
  { value: 'or', label: 'Or', swatch: 'rgb(197 165 90)' },
  { value: 'argent', label: 'Argent', swatch: 'rgb(196 196 201)' },
  { value: 'bleu', label: 'Bleu', swatch: 'rgb(10 132 255)' },
  { value: 'rouge', label: 'Rouge', swatch: 'rgb(255 69 58)' },
  { value: 'transparent', label: 'Transparent', swatch: 'transparent' },
];

export interface ModuleToggles {
  nutrition: boolean;
  sleep: boolean;
  fatigue: boolean;
  measurements: boolean;
}

const MODULE_LABELS: [keyof ModuleToggles, string][] = [
  ['nutrition', 'Nutrition & macros'],
  ['sleep', 'Sommeil'],
  ['fatigue', 'Niveau de fatigue'],
  ['measurements', 'Mensurations'],
];

// Interrupteur en pseudo-élément CSS (before:content-[''] requis par
// Tailwind pour qu'un ::before s'affiche réellement). Alternative native :
// <input type="checkbox" switch /> — rendu système + retour haptique gratuit
// sur Safari/iOS 17.4+ (même mécanisme que celui documenté dans
// InWorkoutSession.tsx pour les vibrations), mais support navigateur encore
// partiel début 2026, donc pas retenu comme implémentation par défaut ici.
const TOGGLE_CLASS =
  "relative h-5 w-9 appearance-none rounded-full bg-white/10 transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform before:content-[''] checked:bg-accent checked:before:translate-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

export default function SettingsScreen({
  modules,
  onModulesChange,
}: {
  modules: ModuleToggles;
  onModulesChange: (next: ModuleToggles) => void;
}) {
  const { theme, accent, setTheme, setAccent } = useTheme();

  return (
    <div className="flex flex-col gap-6 p-4">
      <GlassCard>
        <h3 className="mb-3 text-sm font-medium opacity-70">Apparence</h3>
        <div className="mb-4 flex gap-2">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className={`flex-1 rounded-xl py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                theme === t ? 'bg-accent text-black' : 'bg-white/[0.04]'
              }`}
            >
              {t === 'light' ? 'Clair' : 'Sombre'}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-label={opt.label}
              onClick={() => setAccent(opt.value)}
              className={`h-9 w-9 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                accent === opt.value ? 'scale-110 border-white/80' : 'border-white/20'
              }`}
              style={
                opt.value === 'transparent'
                  ? { backgroundImage: 'repeating-conic-gradient(#8884 0% 25%, transparent 0% 50%)', backgroundSize: '8px 8px' }
                  : { background: opt.swatch }
              }
            />
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="mb-3 text-sm font-medium opacity-70">Modules</h3>
        <p className="mb-3 text-xs opacity-40">Désactivez ce que vous n'utilisez pas pour garder une interface épurée.</p>
        <div className="flex flex-col gap-3">
          {MODULE_LABELS.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <input
                type="checkbox"
                checked={modules[key]}
                onChange={(e) => onModulesChange({ ...modules, [key]: e.target.checked })}
                className={TOGGLE_CLASS}
              />
            </label>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
