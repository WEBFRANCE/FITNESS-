import { db } from '@/lib/db/dexie';
import type { MuscleVolume } from '@/components/body/HeatmapModel3D';

/**
 * Volume (kg × reps, sommé) par groupe musculaire PRIMAIRE sur les N
 * derniers jours. On ne compte que les muscles primaires, pas secondaires :
 * un exercice sollicite son muscle secondaire bien moins intensément que le
 * primaire, additionner les deux au même poids fausserait la heatmap.
 */
export async function computeMuscleVolumes(userId: string, days = 7): Promise<MuscleVolume[]> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;

  const sessions = await db.workoutSessions
    .where('userId')
    .equals(userId)
    .and((s) => s.startedAt >= since)
    .toArray();

  const volumeByMuscle = new Map<string, number>();

  for (const session of sessions) {
    const sessionExercises = await db.sessionExercises.where('sessionId').equals(session.id).toArray();

    for (const se of sessionExercises) {
      const exercise = await db.exercises.get(se.exerciseId);
      if (!exercise) continue;

      const sets = await db.sets.where('sessionExerciseId').equals(se.id).toArray();
      const exerciseVolume = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      if (exerciseVolume === 0) continue;

      for (const muscle of exercise.primaryMuscles) {
        volumeByMuscle.set(muscle, (volumeByMuscle.get(muscle) ?? 0) + exerciseVolume);
      }
    }
  }

  return [...volumeByMuscle.entries()].map(([muscle, volume]) => ({ muscle, volume }));
}
