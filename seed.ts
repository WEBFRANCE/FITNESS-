/**
 * Point d'entrée du seed. Insère le noyau curé (qualité maximale,
 * instructions FR). Pour dépasser les 500 exercices, lancez ensuite
 * import-free-exercise-db.ts séparément (les deux scripts sont indépendants
 * pour pouvoir relancer l'import en masse sans retoucher au noyau).
 *
 * Usage : npx tsx supabase/seed/seed.ts
 * Variables requises : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * (la service_role key est nécessaire pour bypasser RLS en écriture batch —
 * ne jamais l'exposer côté client).
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { CURATED_CORE_EXERCISES } from './curated-core';

async function seedCuratedCore() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const rows = CURATED_CORE_EXERCISES.map((ex) => ({
    id: randomUUID(),
    name: ex.name,
    category: ex.category,
    primary_muscles: ex.primaryMuscles,
    secondary_muscles: ex.secondaryMuscles,
    instructions: ex.instructions,
    is_custom: false,
    created_by: null,
  }));

  const { error } = await supabase.from('exercises').insert(rows);
  if (error) throw error;
  console.log(`${rows.length} exercices "core" insérés.`);
}

seedCuratedCore().catch((err) => {
  console.error(err);
  process.exit(1);
});
