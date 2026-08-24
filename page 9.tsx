import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BodyPageClient from './BodyPageClient';

export default async function BodyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <BodyPageClient userId={user.id} />;
}
