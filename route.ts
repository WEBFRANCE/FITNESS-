import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Remplacement d'exercice par recoupement musculaire (déterministe, pas
 * d'appel IA nécessaire pour cette tâche de correspondance — plus rapide et
 * plus fiable). Score = muscles primaires partagés (poids fort) + muscles
 * secondaires partagés (poids faible).
 */
export async function POST(req: Request) {
  const { exerciseId, excludeCategory } = (await req.json()) as {
    exerciseId: string;
    /** Catégorie à exclure, typiquement celle de l'exercice d'origine si "la machine est prise". */
    excludeCategory?: string;
  };

  const supabase = await createClient();

  const { data: original, error: fetchError } = await supabase
    .from('exercises')
    .select('id, name, category, primary_muscles, secondary_muscles')
    .eq('id', exerciseId)
    .single();

  if (fetchError || !original) {
    return NextResponse.json({ error: 'Exercice introuvable' }, { status: 404 });
  }

  let query = supabase
    .from('exercises')
    .select('id, name, category, primary_muscles, secondary_muscles')
    .neq('id', exerciseId)
    .overlaps('primary_muscles', original.primary_muscles);

  if (excludeCategory) {
    query = query.neq('category', excludeCategory);
  }

  const { data: candidates, error: candidatesError } = await query.limit(20);
  if (candidatesError) {
    return NextResponse.json({ error: candidatesError.message }, { status: 500 });
  }

  const scored = (candidates ?? [])
    .map((c) => {
      const primaryOverlap = c.primary_muscles.filter((m: string) =>
        original.primary_muscles.includes(m)
      ).length;
      const secondaryOverlap = c.secondary_muscles.filter((m: string) =>
        original.secondary_muscles.includes(m)
      ).length;
      return { ...c, score: primaryOverlap * 10 + secondaryOverlap };
    })
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ substitutes: scored.slice(0, 3) });
}
