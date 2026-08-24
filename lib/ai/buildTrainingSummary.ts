import { db } from '@/lib/db/dexie';

/** Résumé texte des séances des N derniers jours, prêt à injecter dans le system prompt du coach. */
export async function buildTrainingSummary(userId: string, days = 30): Promise<string> {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const sessions = await db.workoutSessions
    .where('userId')
    .equals(userId)
    .and((s) => s.startedAt >= since)
    .sortBy('startedAt');

  if (sessions.length === 0) return 'Aucune séance enregistrée sur cette période.';

  const lines = await Promise.all(
    sessions.map(async (session) => {
      const sessionExercises = await db.sessionExercises.where('sessionId').equals(session.id).toArray();
      const exerciseLines = await Promise.all(
        sessionExercises.map(async (se) => {
          const exercise = await db.exercises.get(se.exerciseId);
          const sets = await db.sets.where('sessionExerciseId').equals(se.id).toArray();
          const setSummary = sets.map((s) => `${s.weightKg}kg×${s.reps}${s.rpe ? ` @RPE${s.rpe}` : ''}`).join(', ');
          return `  - ${exercise?.name ?? 'Exercice'} : ${setSummary || 'aucune série loggée'}`;
        })
      );
      const date = new Date(session.startedAt).toLocaleDateString('fr-FR');
      return `${date} :\n${exerciseLines.join('\n')}`;
    })
  );

  return lines.join('\n\n');
}
