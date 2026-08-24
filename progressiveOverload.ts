import { db } from '@/lib/db/dexie';

export interface OverloadSuggestion {
  exerciseId: string;
  suggestedWeightKg: number;
  suggestedReps: number;
  rationale: string;
}

/**
 * Suggestion de charge/répétitions pour la prochaine séance, basée sur les
 * dernières performances de l'exercice. Volontairement déterministe (pas
 * d'appel IA) : la progression de charge est un calcul, pas une génération —
 * plus fiable, instantané, gratuit, et auditable par l'utilisateur.
 *
 * Méthode "double progression" : si les 2 dernières séries normales ont
 * atteint le haut de la fourchette de reps cible avec un RPE ≤ 8, on
 * augmente le poids de ~2,5 %. Sinon, on répète la même charge pour
 * consolider avant d'augmenter.
 */
export async function suggestNextLoad(
  exerciseId: string,
  targetRepsMin = 6,
  targetRepsMax = 12
): Promise<OverloadSuggestion | null> {
  const sessionExercises = await db.sessionExercises.where('exerciseId').equals(exerciseId).toArray();
  if (sessionExercises.length === 0) return null;

  const allSets = (
    await Promise.all(
      sessionExercises.map((se) => db.sets.where('sessionExerciseId').equals(se.id).toArray())
    )
  )
    .flat()
    .filter((s) => s.setType === 'normal')
    .sort((a, b) => b.completedAt - a.completedAt);

  if (allSets.length === 0) return null;

  const lastTwoSets = allSets.slice(0, 2);
  const lastWeight = lastTwoSets[0].weightKg;
  const hitTargetRange = lastTwoSets.every((s) => s.reps >= targetRepsMax && (s.rpe ?? 10) <= 8);

  if (hitTargetRange) {
    const nextWeight = Math.round(lastWeight * 1.025 * 4) / 4; // arrondi au 0,25 kg le plus proche
    return {
      exerciseId,
      suggestedWeightKg: nextWeight,
      suggestedReps: targetRepsMin,
      rationale: `${lastTwoSets.length} dernières séries à ${lastWeight}kg pour ${targetRepsMax}+ reps avec RPE ≤ 8 : prêt pour +2,5 %.`,
    };
  }

  return {
    exerciseId,
    suggestedWeightKg: lastWeight,
    suggestedReps: targetRepsMin,
    rationale: `Fourchette de reps cible (${targetRepsMax}) pas encore atteinte avec aisance : on consolide à ${lastWeight}kg avant d'augmenter.`,
  };
}
