import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExerciseLibrary from '@/components/exercises/ExerciseLibrary';

// ExerciseLibrary est un Client Component mais peut être rendu directement
// depuis ce Server Component : seule la prop userId (string, sérialisable)
// traverse la frontière. onSelect est omis ici (mode simple consultation).
export default async function ExercisesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <ExerciseLibrary userId={user.id} />;
}
