'use client';

/**
 * Onboarding : quelques écrans avant la première séance. Réutilise les
 * primitives Liquid Glass du reste de l'app. L'authentification elle-même
 * (magic link / OAuth Supabase) est volontairement hors-scope ici — c'est
 * du boilerplate @supabase/ssr standard, pas une décision de design.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassButton, GlassCard } from '@/components/ui/GlassPrimitives';
import { useTheme, type Accent } from '@/components/ui/AccentThemeProvider';

export interface OnboardingData {
  displayName: string;
  goal: 'hypertrophie' | 'force' | 'endurance' | 'perte_de_poids';
  accent: Accent;
}

const GOALS: { value: OnboardingData['goal']; label: string }[] = [
  { value: 'hypertrophie', label: 'Hypertrophie' },
  { value: 'force', label: 'Force' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'perte_de_poids', label: 'Perte de poids' },
];

export default function OnboardingFlow({ onComplete }: { onComplete: (data: OnboardingData) => void }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [goal, setGoal] = useState<OnboardingData['goal']>('hypertrophie');
  const { accent, setAccent } = useTheme();

  const steps = [
    <NameStep key="name" value={displayName} onChange={setDisplayName} />,
    <GoalStep key="goal" value={goal} onChange={setGoal} />,
    <AccentStep key="accent" value={accent} onChange={setAccent} />,
  ];

  const isLast = step === steps.length - 1;
  const canProceed = step === 0 ? displayName.trim().length > 0 : true;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[var(--bg-base)] p-6 text-[var(--text-primary)]">
      <div className="mt-4 flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-white/10'}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex-1 py-8"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>

      <GlassButton
        variant="accent"
        disabled={!canProceed}
        onClick={() => {
          if (isLast) {
            onComplete({ displayName: displayName.trim(), goal, accent });
          } else {
            setStep((s) => s + 1);
          }
        }}
      >
        {isLast ? 'Commencer' : 'Continuer'}
      </GlassButton>
    </div>
  );
}

function NameStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Bienvenue.</h1>
      <p className="mb-8 text-sm opacity-60">Comment souhaitez-vous être appelé ?</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Votre prénom"
        autoFocus
        className="w-full rounded-2xl bg-white/[0.04] px-4 py-3.5 text-lg outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      />
    </div>
  );
}

function GoalStep({
  value,
  onChange,
}: {
  value: OnboardingData['goal'];
  onChange: (v: OnboardingData['goal']) => void;
}) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Votre objectif principal.</h1>
      <p className="mb-8 text-sm opacity-60">Ça oriente les suggestions du coach IA — modifiable plus tard.</p>
      <div className="flex flex-col gap-2.5">
        {GOALS.map((g) => (
          <button key={g.value} type="button" onClick={() => onChange(g.value)} className="w-full text-left">
            <GlassCard
              clarity={value === g.value ? 'opaque' : 'balanced'}
              className={value === g.value ? 'border border-accent/50' : ''}
            >
              {g.label}
            </GlassCard>
          </button>
        ))}
      </div>
    </div>
  );
}

function AccentStep({ value, onChange }: { value: Accent; onChange: (a: Accent) => void }) {
  const options: { value: Accent; swatch: string }[] = [
    { value: 'or', swatch: 'rgb(197 165 90)' },
    { value: 'argent', swatch: 'rgb(196 196 201)' },
    { value: 'bleu', swatch: 'rgb(10 132 255)' },
    { value: 'rouge', swatch: 'rgb(255 69 58)' },
  ];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Votre couleur.</h1>
      <p className="mb-8 text-sm opacity-60">Modifiable à tout moment dans les réglages.</p>
      <div className="flex gap-4">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-label={opt.value}
            onClick={() => onChange(opt.value)}
            className={`h-12 w-12 rounded-full border-2 transition-transform ${
              value === opt.value ? 'scale-110 border-white/80' : 'border-white/20'
            }`}
            style={{ background: opt.swatch }}
          />
        ))}
      </div>
    </div>
  );
}
