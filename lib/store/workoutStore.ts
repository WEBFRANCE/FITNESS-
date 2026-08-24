import { create } from 'zustand';
import { db } from '@/lib/db/dexie';
import { queueChange } from '@/lib/sync/syncEngine';
import type { ExerciseBlock, SetEntry } from '@/types/workout';

function estimate1RM(weight: number, reps: number): number {
  return reps <= 1 ? weight : Math.round(weight * (1 + reps / 30));
}

function uuid(): string {
  return crypto.randomUUID();
}

/** Meilleur 1RM estimé connu localement pour un exercice (undefined si aucun). */
async function getBest1RM(exerciseId: string): Promise<number | undefined> {
  const records = await db.personalRecords
    .where('exerciseId')
    .equals(exerciseId)
    .and((r) => r.recordType === '1rm_estime')
    .toArray();
  return records.reduce<number | undefined>(
    (best, r) => (best === undefined || r.value > best ? r.value : best),
    undefined
  );
}

interface WorkoutState {
  sessionId: string | null;
  userId: string | null;
  exercises: ExerciseBlock[];
  isLoading: boolean;

  /** Crée une nouvelle séance (à partir d'un programme, ou vide en freestyle). */
  startSession: (userId: string, routineId?: string) => Promise<void>;
  /** Reprend une séance déjà entamée localement (app relancée en cours de séance). */
  hydrateFromLocal: (sessionId: string) => Promise<void>;
  reorderExercises: (next: ExerciseBlock[]) => void;
  validateSet: (
    exerciseId: string,
    setId: string,
    weight: number,
    reps: number
  ) => Promise<{ isPR: boolean; estimated1RM: number; exerciseName: string }>;
  /** Annotation post-validation (RPE, temps sous tension) — action séparée
      de validateSet pour ne jamais ralentir la saisie rapide poids/reps. */
  annotateSet: (
    exerciseId: string,
    setId: string,
    extras: { rpe?: number; timeUnderTensionSec?: number }
  ) => Promise<void>;
  endSession: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  sessionId: null,
  userId: null,
  exercises: [],
  isLoading: false,

  // ── Démarrage d'une séance ──────────────────────────────────────────
  startSession: async (userId, routineId) => {
    set({ isLoading: true });

    const sessionId = uuid();
    const startedAt = Date.now();

    await db.workoutSessions.put({ id: sessionId, userId, routineId, startedAt, updatedAt: startedAt });
    await queueChange('workoutSessions', 'insert', sessionId, {
      id: sessionId,
      user_id: userId,
      routine_id: routineId ?? null,
      started_at: new Date(startedAt).toISOString(),
    });

    let exercises: ExerciseBlock[] = [];

    if (routineId) {
      const routineExercises = await db.routineExercises
        .where('routineId')
        .equals(routineId)
        .sortBy('position');

      exercises = await Promise.all(
        routineExercises.map(async (re) => {
          const exercise = await db.exercises.get(re.exerciseId);
          const previousBest1RM = await getBest1RM(re.exerciseId);
          const sessionExerciseId = uuid();

          await db.sessionExercises.put({
            id: sessionExerciseId,
            sessionId,
            exerciseId: re.exerciseId,
            position: re.position,
            updatedAt: Date.now(),
          });
          await queueChange('sessionExercises', 'insert', sessionExerciseId, {
            id: sessionExerciseId,
            session_id: sessionId,
            exercise_id: re.exerciseId,
            position: re.position,
          });

          const sets: SetEntry[] = Array.from({ length: re.targetSets ?? 3 }, () => ({
            id: uuid(),
            type: 'normal',
            weight: 0,
            reps: 0,
            completed: false,
          }));

          return { id: sessionExerciseId, name: exercise?.name ?? 'Exercice', previousBest1RM, sets };
        })
      );
    }

    set({ sessionId, userId, exercises, isLoading: false });
  },

  // ── Reprise d'une séance en cours ────────────────────────────────────
  hydrateFromLocal: async (sessionId) => {
    set({ isLoading: true });

    const session = await db.workoutSessions.get(sessionId);
    const sessionExercises = await db.sessionExercises
      .where('sessionId')
      .equals(sessionId)
      .sortBy('position');

    const exercises: ExerciseBlock[] = await Promise.all(
      sessionExercises.map(async (se) => {
        const exercise = await db.exercises.get(se.exerciseId);
        const sets = await db.sets.where('sessionExerciseId').equals(se.id).sortBy('setNumber');
        const previousBest1RM = await getBest1RM(se.exerciseId);

        return {
          id: se.id,
          name: exercise?.name ?? 'Exercice',
          previousBest1RM,
          sets: sets.map((s) => ({
            id: s.id,
            type: s.setType,
            weight: s.weightKg,
            reps: s.reps,
            completed: true,
            isPR: s.isPR,
          })),
        };
      })
    );

    set({ sessionId, userId: session?.userId ?? null, exercises, isLoading: false });
  },

  // ── Réordonnancement (drag & drop) ──────────────────────────────────
  reorderExercises: (next) => {
    set({ exercises: next });
    next.forEach((ex, index) => {
      void db.sessionExercises.update(ex.id, { position: index, updatedAt: Date.now() });
      void queueChange('sessionExercises', 'update', ex.id, { id: ex.id, position: index });
    });
  },

  // ── Validation d'une série ───────────────────────────────────────────
  validateSet: async (exerciseId, setId, weight, reps) => {
    const { exercises, userId } = get();
    const exercise = exercises.find((e) => e.id === exerciseId);
    const targetSet = exercise?.sets.find((s) => s.id === setId);
    const setType = targetSet?.type ?? 'normal';
    const estimated1RM = estimate1RM(weight, reps);
    const isPR = !!exercise?.previousBest1RM && estimated1RM > exercise.previousBest1RM;
    const completedAt = Date.now();

    set({
      exercises: exercises.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : {
              ...ex,
              previousBest1RM: isPR ? estimated1RM : ex.previousBest1RM,
              sets: ex.sets.map((s) =>
                s.id === setId ? { ...s, weight, reps, completed: true, isPR } : s
              ),
            }
      ),
    });

    const setNumber = (exercise?.sets.findIndex((s) => s.id === setId) ?? 0) + 1;

    await db.sets.put({
      id: setId,
      sessionExerciseId: exerciseId,
      setNumber,
      setType,
      weightKg: weight,
      reps,
      isPR,
      completedAt,
      updatedAt: completedAt,
    });
    await queueChange('sets', 'insert', setId, {
      id: setId,
      session_exercise_id: exerciseId,
      set_number: setNumber,
      set_type: setType,
      weight_kg: weight,
      reps,
      is_pr: isPR,
      completed_at: new Date(completedAt).toISOString(),
    });

    if (isPR && userId) {
      const recordId = uuid();
      await db.personalRecords.put({
        id: recordId,
        userId,
        exerciseId,
        recordType: '1rm_estime',
        value: estimated1RM,
        setId,
        achievedAt: completedAt,
        updatedAt: completedAt,
      });
      await queueChange('personalRecords', 'insert', recordId, {
        id: recordId,
        user_id: userId,
        exercise_id: exerciseId,
        record_type: '1rm_estime',
        value: estimated1RM,
        set_id: setId,
        achieved_at: new Date(completedAt).toISOString(),
      });
    }

    return { isPR, estimated1RM, exerciseName: exercise?.name ?? '' };
  },

  annotateSet: async (exerciseId, setId, extras) => {
    const { exercises } = get();
    set({
      exercises: exercises.map((ex) =>
        ex.id !== exerciseId
          ? ex
          : { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...extras } : s)) }
      ),
    });

    await db.sets.update(setId, { ...extras, updatedAt: Date.now() });
    await queueChange('sets', 'update', setId, {
      id: setId,
      rpe: extras.rpe ?? null,
      time_under_tension_sec: extras.timeUnderTensionSec ?? null,
    });
  },

  // ── Fin de séance ─────────────────────────────────────────────────────
  endSession: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    const endedAt = Date.now();

    await db.workoutSessions.update(sessionId, { endedAt, updatedAt: endedAt });
    await queueChange('workoutSessions', 'update', sessionId, {
      id: sessionId,
      ended_at: new Date(endedAt).toISOString(),
    });

    set({ sessionId: null, exercises: [] });
  },
}));
