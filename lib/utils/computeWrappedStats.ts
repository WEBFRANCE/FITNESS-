import { db } from '@/lib/db/dexie';

export interface WrappedStats {
  period: string; // ex: '2026-08' ou '2026'
  sessionsCount: number;
  totalVolumeKg: number;
  totalSets: number;
  prCount: number;
  topExercise: { name: string; sessionsCount: number } | null;
  totalDurationMinutes: number;
}

export async function computeWrappedStats(
  userId: string,
  from: Date,
  to: Date,
  periodLabel: string
): Promise<WrappedStats> {
  const fromMs = from.getTime();
  const toMs = to.getTime();

  const sessions = await db.workoutSessions
    .where('userId')
    .equals(userId)
    .and((s) => s.startedAt >= fromMs && s.startedAt < toMs)
    .toArray();

  let totalVolumeKg = 0;
  let totalSets = 0;
  let prCount = 0;
  let totalDurationMinutes = 0;
  const exerciseSessionCount = new Map<string, number>();

  for (const session of sessions) {
    if (session.endedAt) {
      totalDurationMinutes += (session.endedAt - session.startedAt) / 60000;
    }

    const sessionExercises = await db.sessionExercises.where('sessionId').equals(session.id).toArray();
    for (const se of sessionExercises) {
      const sets = await db.sets.where('sessionExerciseId').equals(se.id).toArray();
      totalSets += sets.length;
      totalVolumeKg += sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      prCount += sets.filter((s) => s.isPR).length;

      const exercise = await db.exercises.get(se.exerciseId);
      if (exercise) {
        exerciseSessionCount.set(exercise.name, (exerciseSessionCount.get(exercise.name) ?? 0) + 1);
      }
    }
  }

  const topExerciseEntry = [...exerciseSessionCount.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    period: periodLabel,
    sessionsCount: sessions.length,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets,
    prCount,
    topExercise: topExerciseEntry ? { name: topExerciseEntry[0], sessionsCount: topExerciseEntry[1] } : null,
    totalDurationMinutes: Math.round(totalDurationMinutes),
  };
}
