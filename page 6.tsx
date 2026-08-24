import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WrappedPageClient from './WrappedPageClient';

export default async function WrappedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <WrappedPageClient userId={user.id} />;
}
