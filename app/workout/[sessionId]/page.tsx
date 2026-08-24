import { redirect } from 'next/navigation';
import InWorkoutSession from '@/components/workout/InWorkoutSession';
import { createClient } from '@/lib/supabase/server';

/**
 * Route /workout/new (routine optionnelle via ?routine=xxx) ou
 * /workout/[un vrai id de séance] pour reprendre une séance en cours.
 */
export default async function WorkoutSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ routine?: string }>;
}) {
  const { sessionId } = await params;
  const { routine: routineId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isNew = sessionId === 'new';

  return (
    <InWorkoutSession
      userId={user.id}
      routineId={isNew ? routineId : undefined}
      existingSessionId={isNew ? undefined : sessionId}
    />
  );
}
