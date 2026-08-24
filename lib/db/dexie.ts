import Dexie, { type Table } from 'dexie';

/**
 * Schéma local (IndexedDB via Dexie) — source de vérité pendant la séance.
 * Chaque table mirrore sa contrepartie Supabase (types en camelCase côté
 * local, snake_case côté Postgres — la conversion se fait dans syncEngine).
 */

// ── Sync ──────────────────────────────────────────────────────────────
export type SyncOperation = 'insert' | 'update' | 'delete';

export interface SyncQueueEntry {
  id?: number; // auto-incrémenté par Dexie
  table: string; // nom de la table LOCALE (camelCase, ex: 'workoutSessions')
  operation: SyncOperation;
  recordId: string;
  payload: unknown; // forme prête pour Supabase (snake_case), construite par l'appelant
  createdAt: number;
  synced: boolean;
  attempts: number;
  lastError?: string;
}

// ── Exercices ─────────────────────────────────────────────────────────
export interface LocalExercise {
  id: string;
  name: string;
  category: 'poids_libres' | 'machine' | 'poids_du_corps' | 'cardio';
  primaryMuscles: string[];
  secondaryMuscles: string[];
  gifUrl?: string;
  model3dUrl?: string;
  instructions?: string;
  isCustom: boolean;
  createdBy: string | null; // null = exercice global de la bibliothèque
  updatedAt: number;
}

// ── Programmes ────────────────────────────────────────────────────────
export interface LocalRoutine {
  id: string;
  userId: string;
  name: string;
  aiGenerated: boolean;
  updatedAt: number;
}

export interface LocalRoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  position: number;
  targetSets?: number;
  targetReps?: string; // ex: "8-12"
  updatedAt: number;
}

// ── Séances ───────────────────────────────────────────────────────────
export interface LocalWorkoutSession {
  id: string;
  userId: string;
  routineId?: string;
  startedAt: number;
  endedAt?: number;
  bodyweightKg?: number;
  notes?: string;
  updatedAt: number;
}

export interface LocalSessionExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  position: number;
  supersetGroupId?: string;
  updatedAt: number;
}

export interface LocalSet {
  id: string;
  sessionExerciseId: string;
  setNumber: number;
  setType: 'warmup' | 'normal' | 'dropset';
  weightKg: number;
  reps: number;
  rpe?: number;
  timeUnderTensionSec?: number;
  restAfterSec?: number;
  isPR: boolean;
  completedAt: number;
  updatedAt: number;
}

export interface LocalPersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  recordType: '1rm_estime' | 'volume' | 'reps';
  value: number;
  setId?: string;
  achievedAt: number;
  updatedAt: number;
}

// ── Journal quotidien (nutrition / sommeil / fatigue) ───────────────────
export interface LocalDailyLog {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  sleepHours?: number;
  sleepQuality?: number; // 1-5
  fatigueLevel?: number; // 1-5
  nutrition?: {
    calories?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    waterMl?: number;
    supplements?: string[];
  };
  updatedAt: number;
}

// ── Mensurations ──────────────────────────────────────────────────────
export interface LocalBodyMeasurement {
  id: string;
  userId: string;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  measurements?: Record<string, number>; // { bras: 38, taille: 82, ... }
  updatedAt: number;
}

// ── Base ──────────────────────────────────────────────────────────────
class AppDatabase extends Dexie {
  exercises!: Table<LocalExercise, string>;
  routines!: Table<LocalRoutine, string>;
  routineExercises!: Table<LocalRoutineExercise, string>;
  workoutSessions!: Table<LocalWorkoutSession, string>;
  sessionExercises!: Table<LocalSessionExercise, string>;
  sets!: Table<LocalSet, string>;
  personalRecords!: Table<LocalPersonalRecord, string>;
  dailyLogs!: Table<LocalDailyLog, string>;
  bodyMeasurements!: Table<LocalBodyMeasurement, string>;
  syncQueue!: Table<SyncQueueEntry, number>;

  constructor() {
    super('musculation-app');

    // Les chaînes ci-dessous ne listent QUE les champs indexés (ceux par
    // lesquels on filtre/trie) — les autres champs de l'interface sont
    // stockés normalement mais non indexés, pas besoin de tout lister.
    this.version(1).stores({
      exercises: 'id, isCustom, createdBy, category',
      routines: 'id, userId',
      routineExercises: 'id, routineId, position',
      workoutSessions: 'id, userId, startedAt, endedAt',
      sessionExercises: 'id, sessionId, position',
      sets: 'id, sessionExerciseId, completedAt',
      personalRecords: 'id, userId, exerciseId, recordType',
      syncQueue: '++id, table, synced, createdAt',
    });

    // v2 : ajout du journal quotidien + mensurations (module "écosystème
    // holistique"). Dexie exige de redéclarer TOUTES les tables à
    // conserver à chaque nouvelle version, pas seulement le diff — sinon
    // les tables omises sont supprimées à la migration.
    this.version(2).stores({
      exercises: 'id, isCustom, createdBy, category',
      routines: 'id, userId',
      routineExercises: 'id, routineId, position',
      workoutSessions: 'id, userId, startedAt, endedAt',
      sessionExercises: 'id, sessionId, position',
      sets: 'id, sessionExerciseId, completedAt',
      personalRecords: 'id, userId, exerciseId, recordType',
      dailyLogs: 'id, userId, date',
      bodyMeasurements: 'id, userId, date',
      syncQueue: '++id, table, synced, createdAt',
    });
  }
}

export const db = new AppDatabase();
