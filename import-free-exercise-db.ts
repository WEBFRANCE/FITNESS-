/**
 * Importe le dataset public domain "free-exercise-db" (yuhonas, licence
 * Unlicense — zéro restriction, pas d'attribution requise) pour compléter
 * la bibliothèque au-delà des 500 exercices demandés. ~800 exercices
 * sourcés, mappés vers notre schéma. Indépendant de seed.ts.
 *
 * Usage : npx tsx supabase/seed/import-free-exercise-db.ts
 *
 * Note : vérifiez le chemin exact des images dans le JSON une fois
 * téléchargé (peut différer légèrement selon la version du dataset) avant
 * de faire confiance à gif_url en prod — la structure ci-dessous reflète
 * l'organisation du dépôt au moment de l'écriture de ce script.
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

interface SourceExercise {
  id: string;
  name: string;
  category: string; // 'strength' | 'stretching' | 'cardio' | 'olympic weightlifting' | 'strongman' | 'plyometrics' | 'powerlifting'
  equipment: string | null; // 'dumbbell' | 'barbell' | 'body only' | 'machine' | 'cable' | 'kettlebells' | ...
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
}

function mapCategory(source: SourceExercise): 'poids_libres' | 'machine' | 'poids_du_corps' | 'cardio' {
  if (source.category === 'cardio' || source.category === 'plyometrics') return 'cardio';
  if (source.equipment === 'body only' || source.equipment === null) return 'poids_du_corps';
  if (source.equipment === 'machine' || source.equipment === 'cable') return 'machine';
  return 'poids_libres'; // barbell, dumbbell, kettlebells, bands, etc.
}

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Téléchargement du dataset source échoué : ${res.status}`);
  const source: SourceExercise[] = await res.json();

  const rows = source.map((ex) => ({
    id: randomUUID(),
    name: ex.name,
    category: mapCategory(ex),
    primary_muscles: ex.primaryMuscles,
    secondary_muscles: ex.secondaryMuscles,
    instructions: ex.instructions.join(' '),
    gif_url: ex.images[0]
      ? `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${ex.images[0]}`
      : null,
    is_custom: false,
    created_by: null,
  }));

  const BATCH_SIZE = 200;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('exercises').insert(batch);
    if (error) throw error;
    console.log(`Importé ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log(`Terminé : ${rows.length} exercices importés (source : free-exercise-db, licence Unlicense).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
