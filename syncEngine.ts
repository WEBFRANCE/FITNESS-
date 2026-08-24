import type { Table } from 'dexie';
import { db, type SyncQueueEntry, type SyncOperation } from '@/lib/db/dexie';
import { supabase } from '@/lib/supabase/client'; // client standard @supabase/ssr côté navigateur

// Correspondance nom de table LOCALE (camelCase) → REMOTE (snake_case),
// uniquement quand ils diffèrent.
const REMOTE_TABLE: Record<string, string> = {
  workoutSessions: 'workout_sessions',
  sessionExercises: 'session_exercises',
  routineExercises: 'routine_exercises',
  personalRecords: 'personal_records',
  dailyLogs: 'daily_logs',
  bodyMeasurements: 'body_measurements',
};

function remoteName(localTable: string): string {
  return REMOTE_TABLE[localTable] ?? localTable;
}

// ─────────────────────────────────────────────────────────────────────
// MONTÉE : Dexie → Supabase
// ─────────────────────────────────────────────────────────────────────

/**
 * À appeler juste après CHAQUE écriture locale dans Dexie (typiquement
 * depuis les actions du futur `useWorkoutStore`). `payload` doit déjà être
 * dans la forme attendue par Supabase (snake_case) : c'est l'appelant qui
 * connaît le mapping exact champ par champ.
 */
export async function queueChange(
  table: string,
  operation: SyncOperation,
  recordId: string,
  payload: unknown
) {
  await db.syncQueue.add({
    table,
    operation,
    recordId,
    payload,
    createdAt: Date.now(),
    synced: false,
    attempts: 0,
  });

  // Best-effort : la donnée est déjà visible localement, on ne bloque
  // jamais l'UI en attendant la confirmation réseau.
  if (typeof navigator !== 'undefined' && navigator.onLine) void flushQueue();
}

let flushing = false;

/**
 * Vide la file vers Supabase dans l'ordre d'écriture (un "update" ne doit
 * jamais partir avant l'"insert" qui l'a précédé pour le même enregistrement).
 * Réentrant : un appel pendant qu'un flush est déjà en cours ne fait rien,
 * le flush en cours traitera les nouvelles entrées à son prochain passage.
 */
export async function flushQueue() {
  if (flushing || typeof navigator === 'undefined' || !navigator.onLine) return;
  flushing = true;

  try {
    const pending = await db.syncQueue.filter((e) => !e.synced).sortBy('createdAt');

    for (const entry of pending) {
      try {
        await pushEntry(entry);
        await db.syncQueue.update(entry.id!, { synced: true });
      } catch (err) {
        await db.syncQueue.update(entry.id!, {
          attempts: entry.attempts + 1,
          lastError: err instanceof Error ? err.message : String(err),
        });
        if (!navigator.onLine) break; // le réseau vient de retomber, on arrête proprement
      }
    }

    // Purge des entrées synchronisées depuis plus de 7 jours, pour que la
    // file ne grossisse pas indéfiniment.
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await db.syncQueue.filter((e) => e.synced && e.createdAt < weekAgo).delete();
  } finally {
    flushing = false;
  }
}

async function pushEntry(entry: SyncQueueEntry) {
  const table = remoteName(entry.table);

  if (entry.operation === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', entry.recordId);
    if (error) throw error;
    return;
  }

  // insert / update : upsert couvre les deux et reste idempotent si l'entrée
  // est rejouée après une coupure survenue juste après un succès non confirmé.
  const { error } = await supabase.from(table).upsert(entry.payload as Record<string, unknown>);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────
// DESCENTE : Supabase Realtime → Dexie
// ─────────────────────────────────────────────────────────────────────
// Sécurité : postgres_changes ne délivre à un client que les lignes que ses
// propres policies RLS l'autoriseraient à lire — pas besoin de filtrer
// manuellement par user_id pour la sécurité. Pensez seulement à activer
// chaque table dans Database → Publications → supabase_realtime, sinon le
// flux reste silencieux sans erreur.

function subscribeTable<T extends { id: string; updatedAt: number }>(
  channel: ReturnType<typeof supabase.channel>,
  remoteTable: string,
  localTable: Table<T, string>,
  fromRemote: (row: Record<string, unknown>) => T
) {
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: remoteTable },
    async (payload) => {
      const row = (payload.new ?? payload.old) as Record<string, unknown> | null;
      if (!row?.id) return;
      const id = row.id as string;

      if (payload.eventType === 'DELETE') {
        await localTable.delete(id);
        return;
      }

      const incoming = fromRemote(row);
      const existing = await localTable.get(id);
      const remoteUpdatedAt = row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now();

      // Dernier écrit gagne : on n'écrase la version locale que si la
      // version distante est au moins aussi récente (évite d'effacer une
      // modification locale pas encore remontée).
      if (!existing || remoteUpdatedAt >= existing.updatedAt) {
        await localTable.put(incoming, id);
      }
    }
  );
}

export function startRealtimeSync(userId: string): () => void {
  const channel = supabase.channel(`sync:${userId}`);

  subscribeTable(channel, 'workout_sessions', db.workoutSessions, (r) => ({
    id: r.id as string,
    userId: r.user_id as string,
    routineId: r.routine_id as string | undefined,
    startedAt: new Date(r.started_at as string).getTime(),
    endedAt: r.ended_at ? new Date(r.ended_at as string).getTime() : undefined,
    bodyweightKg: r.bodyweight_kg as number | undefined,
    notes: r.notes as string | undefined,
    updatedAt: Date.now(),
  }));

  subscribeTable(channel, 'sets', db.sets, (r) => ({
    id: r.id as string,
    sessionExerciseId: r.session_exercise_id as string,
    setNumber: r.set_number as number,
    setType: r.set_type as 'warmup' | 'normal' | 'dropset',
    weightKg: r.weight_kg as number,
    reps: r.reps as number,
    rpe: r.rpe as number | undefined,
    timeUnderTensionSec: r.time_under_tension_sec as number | undefined,
    restAfterSec: r.rest_after_sec as number | undefined,
    isPR: r.is_pr as boolean,
    completedAt: new Date(r.completed_at as string).getTime(),
    updatedAt: Date.now(),
  }));

  // Même schéma pour session_exercises / personal_records / routines :
  // un subscribeTable(...) de plus par table, avec son propre `fromRemote`.
  // Omis ici pour rester lisible — le pattern est strictement identique.

  channel.subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

// ─────────────────────────────────────────────────────────────────────
// Déclencheurs globaux
// ─────────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue());
  // Filet de sécurité : l'évènement 'online' n'est pas toujours fiable sur
  // mobile (Safari iOS notamment) au retour réseau.
  setInterval(() => void flushQueue(), 30_000);
}
