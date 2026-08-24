'use client';

/**
 * InWorkoutSession — écran principal "In-Workout"
 * -------------------------------------------------
 * Branché sur useWorkoutStore (Zustand) : les exercices/séries transitent
 * par le store, qui persiste dans Dexie et met en file la synchronisation
 * Supabase (voir lib/store/workoutStore.ts et lib/sync/syncEngine.ts).
 *
 * Saisie poids/reps via NumericKeypad (GlassPrimitives) plutôt que des
 * inputs natifs. RPE et temps sous tension s'annotent après coup (bouton
 * "+ détail" une fois la série validée) pour ne jamais ralentir le flux
 * principal poids → reps → valider.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'motion/react';
import { Check, GripVertical, Trophy } from 'lucide-react';
import { useWorkoutStore } from '@/lib/store/workoutStore';
import { GlassSheet, GlassButton, NumericKeypad } from '@/components/ui/GlassPrimitives';
import type { ExerciseBlock, SetEntry } from '@/types/workout';

// ── Haptique — à extraire dans lib/haptics/haptics.ts ───────────────
type HapticPattern = 'light' | 'medium' | 'success';

const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [15, 40, 15], // double pulse pour un PR
};

function triggerHaptic(pattern: HapticPattern) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  // Safari/WebKit sur iOS n'implémente pas navigator.vibrate (choix
  // délibéré d'Apple, toujours vrai en 2026) : cet appel y est un no-op
  // silencieux. Contournement non officiel possible via un <input
  // type="checkbox" switch> (Safari 17.4+, cf. la librairie "ios-haptics"),
  // à évaluer selon votre tolérance au risque (mécanisme non documenté).
  navigator.vibrate(HAPTIC_PATTERNS[pattern]);
}

// ── Son — à extraire dans lib/sound/soundEngine.ts ──────────────────
const soundCache = new Map<string, HTMLAudioElement>();

function playSound(name: 'set-validated' | 'rest-end', volume = 0.5) {
  if (typeof window === 'undefined') return;
  let audio = soundCache.get(name);
  if (!audio) {
    audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = volume;
    soundCache.set(name, audio);
  }
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}

// ── Composant principal ───────────────────────────────────────────────
export default function InWorkoutSession({
  userId,
  routineId,
  existingSessionId,
}: {
  userId: string;
  routineId?: string;
  /** Fourni quand on reprend une séance déjà entamée (sinon on en crée une nouvelle). */
  existingSessionId?: string;
}) {
  const sessionId = useWorkoutStore((s) => s.sessionId);
  const exercises = useWorkoutStore((s) => s.exercises);
  const isLoading = useWorkoutStore((s) => s.isLoading);
  const startSession = useWorkoutStore((s) => s.startSession);
  const hydrateFromLocal = useWorkoutStore((s) => s.hydrateFromLocal);
  const reorderExercises = useWorkoutStore((s) => s.reorderExercises);
  const validateSet = useWorkoutStore((s) => s.validateSet);
  const annotateSet = useWorkoutStore((s) => s.annotateSet);

  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [celebratingPR, setCelebratingPR] = useState<{ exercise: string; value: number } | null>(
    null
  );

  useEffect(() => {
    if (sessionId) return; // déjà hydraté, ne rien refaire
    if (existingSessionId) {
      void hydrateFromLocal(existingSessionId);
    } else {
      void startSession(userId, routineId);
    }
  }, [sessionId, existingSessionId, userId, routineId, startSession, hydrateFromLocal]);

  const handleReorder = useCallback(
    (next: ExerciseBlock[]) => {
      reorderExercises(next);
      triggerHaptic('light');
    },
    [reorderExercises]
  );

  const handleValidateSet = useCallback(
    async (exerciseId: string, setId: string, weight: number, reps: number) => {
      const { isPR, estimated1RM, exerciseName } = await validateSet(exerciseId, setId, weight, reps);

      if (isPR) {
        triggerHaptic('success');
        setCelebratingPR({ exercise: exerciseName, value: estimated1RM });
      } else {
        triggerHaptic('medium');
      }
      playSound('set-validated');
      setRestSeconds(90); // à terme : lu depuis les préférences de repos de l'exercice
    },
    [validateSet]
  );

  const handleAnnotateSet = useCallback(
    (exerciseId: string, setId: string, extras: { rpe?: number; timeUnderTensionSec?: number }) => {
      void annotateSet(exerciseId, setId, extras);
    },
    [annotateSet]
  );

  return (
    <div className="relative min-h-screen bg-[var(--bg-base)] pb-32 text-[var(--text-primary)]">
      <header className="glass sticky top-0 z-10 px-5 pb-4 pt-6" data-clarity="balanced">
        <h1 className="text-lg font-semibold tracking-tight">Séance en cours</h1>
        <p className="text-sm opacity-60">{exercises.length} exercices</p>
      </header>

      {isLoading && exercises.length === 0 ? (
        <p className="px-5 pt-10 text-center text-sm opacity-40">Chargement de la séance…</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={exercises}
          onReorder={handleReorder}
          className="flex flex-col gap-4 px-4 pt-4"
        >
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onValidateSet={handleValidateSet}
              onAnnotateSet={handleAnnotateSet}
            />
          ))}
        </Reorder.Group>
      )}

      {restSeconds !== null && (
        <RestTimerRing
          seconds={restSeconds}
          onEnd={() => {
            playSound('rest-end');
            triggerHaptic('light');
            setRestSeconds(null);
          }}
        />
      )}

      <AnimatePresence>
        {celebratingPR && (
          <PRCelebration
            exerciseName={celebratingPR.exercise}
            value={celebratingPR.value}
            onDone={() => setCelebratingPR(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Carte d'exercice réordonnable ───────────────────────────────────────
function ExerciseCard({
  exercise,
  onValidateSet,
  onAnnotateSet,
}: {
  exercise: ExerciseBlock;
  onValidateSet: (exerciseId: string, setId: string, weight: number, reps: number) => void;
  onAnnotateSet: (exerciseId: string, setId: string, extras: { rpe?: number; timeUnderTensionSec?: number }) => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={exercise}
      dragListener={false}
      dragControls={dragControls}
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 48px rgb(0 0 0 / 0.28)' }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      className="glass rounded-glass p-4"
      data-clarity="balanced"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium">{exercise.name}</h3>
        <button
          type="button"
          aria-label="Réorganiser l'exercice"
          onPointerDown={(e) => dragControls.start(e)}
          className="touch-none cursor-grab p-2 opacity-40 active:opacity-80"
        >
          <GripVertical className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {exercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            index={i + 1}
            set={set}
            onValidate={(weight, reps) => onValidateSet(exercise.id, set.id, weight, reps)}
            onAnnotate={(extras) => onAnnotateSet(exercise.id, set.id, extras)}
          />
        ))}
      </div>
    </Reorder.Item>
  );
}

// ── Ligne de série : saisie via keypad + validation + annotation ─────────
function SetRow({
  index,
  set,
  onValidate,
  onAnnotate,
}: {
  index: number;
  set: SetEntry;
  onValidate: (weight: number, reps: number) => void;
  onAnnotate: (extras: { rpe?: number; timeUnderTensionSec?: number }) => void;
}) {
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.reps);
  const [editingField, setEditingField] = useState<'weight' | 'reps' | null>(null);
  const [keypadValue, setKeypadValue] = useState('');
  const [annotating, setAnnotating] = useState(false);

  const label = { warmup: 'Éch.', normal: String(index), dropset: 'Drop' }[set.type];

  function openKeypad(field: 'weight' | 'reps') {
    if (set.completed) return;
    setKeypadValue(String(field === 'weight' ? weight : reps));
    setEditingField(field);
  }

  function confirmKeypad() {
    const value = Number(keypadValue) || 0;
    if (editingField === 'weight') setWeight(value);
    else if (editingField === 'reps') setReps(value);
    setEditingField(null);
    setKeypadValue('');
  }

  return (
    <>
      <motion.div
        layout
        className={`flex items-center gap-3 rounded-2xl px-3 py-2 ${
          set.completed ? 'bg-accent/10' : 'bg-white/[0.03]'
        }`}
      >
        <span className="w-9 text-center text-sm opacity-50">{label}</span>

        <button
          type="button"
          disabled={set.completed}
          onClick={() => openKeypad('weight')}
          aria-label="Modifier le poids"
          className="w-16 rounded-xl bg-transparent text-center text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          {weight}
        </button>
        <span className="text-xs opacity-40">kg</span>

        <button
          type="button"
          disabled={set.completed}
          onClick={() => openKeypad('reps')}
          aria-label="Modifier les répétitions"
          className="w-12 rounded-xl bg-transparent text-center text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          {reps}
        </button>
        <span className="text-xs opacity-40">reps</span>

        {set.completed && (
          <button
            type="button"
            onClick={() => setAnnotating(true)}
            className="text-[10px] uppercase tracking-wide opacity-40"
          >
            {set.rpe ? `RPE ${set.rpe}` : '+ détail'}
          </button>
        )}

        <button
          type="button"
          onClick={() => !set.completed && onValidate(weight, reps)}
          aria-label="Valider la série"
          className={`ml-auto flex h-9 w-9 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
            set.completed ? 'bg-accent text-black' : 'bg-white/10'
          }`}
        >
          {set.isPR ? (
            <Trophy className="h-4 w-4" strokeWidth={2} />
          ) : (
            <Check className="h-4 w-4" strokeWidth={2} />
          )}
        </button>
      </motion.div>

      <GlassSheet
        open={editingField !== null}
        onClose={() => setEditingField(null)}
        title={editingField === 'weight' ? 'Poids (kg)' : 'Répétitions'}
      >
        <p className="mb-4 text-center text-4xl font-light tabular-nums">{keypadValue || '0'}</p>
        <NumericKeypad
          value={keypadValue}
          onChange={setKeypadValue}
          onConfirm={confirmKeypad}
          allowDecimal={editingField === 'weight'}
        />
      </GlassSheet>

      <SetAnnotationSheet
        open={annotating}
        onClose={() => setAnnotating(false)}
        initialRpe={set.rpe}
        initialTUT={set.timeUnderTensionSec}
        onSave={(extras) => {
          onAnnotate(extras);
          setAnnotating(false);
        }}
      />
    </>
  );
}

// ── Annotation post-validation : RPE + temps sous tension ─────────────────
function SetAnnotationSheet({
  open,
  onClose,
  initialRpe,
  initialTUT,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initialRpe?: number;
  initialTUT?: number;
  onSave: (extras: { rpe?: number; timeUnderTensionSec?: number }) => void;
}) {
  const [rpe, setRpe] = useState(initialRpe);
  const [tut, setTut] = useState(initialTUT ?? 0);

  // Resynchronise à chaque ouverture : les valeurs initiales peuvent
  // différer d'une série à l'autre (sheet réutilisée par toutes les lignes).
  useEffect(() => {
    if (open) {
      setRpe(initialRpe);
      setTut(initialTUT ?? 0);
    }
  }, [open, initialRpe, initialTUT]);

  return (
    <GlassSheet open={open} onClose={onClose} title="Détail de la série">
      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-xs opacity-60">RPE (effort perçu)</p>
          <div className="flex gap-1.5">
            {[6, 7, 8, 9, 10].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRpe(v)}
                className={`h-9 flex-1 rounded-xl text-sm transition-colors ${
                  rpe === v ? 'bg-accent text-black' : 'bg-white/[0.04]'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs opacity-60">Temps sous tension (secondes)</p>
          <input
            type="number"
            inputMode="numeric"
            value={tut || ''}
            onChange={(e) => setTut(Number(e.target.value) || 0)}
            placeholder="0"
            className="w-full rounded-xl bg-white/[0.04] px-3 py-2.5 text-center text-base text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          />
        </div>

        <GlassButton
          variant="accent"
          onClick={() => onSave({ rpe, timeUnderTensionSec: tut > 0 ? tut : undefined })}
        >
          Enregistrer
        </GlassButton>
      </div>
    </GlassSheet>
  );
}

// ── Cercle de repos flottant ─────────────────────────────────────────────
function RestTimerRing({ seconds, onEnd }: { seconds: number; onEnd: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    if (remaining <= 0) {
      onEndRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / seconds;

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      className="glass fixed bottom-24 right-5 flex h-16 w-16 items-center justify-center rounded-full"
      data-clarity="clear"
    >
      <svg width={56} height={56} className="-rotate-90">
        <circle cx={28} cy={28} r={radius} stroke="currentColor" strokeOpacity={0.15} strokeWidth={3} fill="none" />
        <circle
          cx={28}
          cy={28}
          r={radius}
          stroke="rgb(var(--accent-rgb))"
          strokeWidth={3}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-medium tabular-nums">{remaining}s</span>
    </motion.div>
  );
}

// ── Célébration de record personnel ──────────────────────────────────────
function PRCelebration({
  exerciseName,
  value,
  onDone,
}: {
  exerciseName: string;
  value: number;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = setTimeout(() => onDoneRef.current(), 3500);
    return () => clearTimeout(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDone}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="glass mx-6 flex flex-col items-center gap-3 rounded-glass px-8 py-10 text-center"
        data-clarity="opaque"
      >
        <motion.div
          initial={{ rotate: -15, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}
        >
          <Trophy className="h-12 w-12 text-accent" strokeWidth={1.5} />
        </motion.div>
        <p className="text-sm uppercase tracking-widest opacity-60">Record personnel</p>
        <h2 className="text-2xl font-semibold">{exerciseName}</h2>
        <p className="text-4xl font-light tabular-nums">{value} kg</p>
        <p className="text-xs opacity-40">1RM estimé · formule d'Epley</p>
      </motion.div>
    </motion.div>
  );
}
