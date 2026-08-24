'use client';

import { useRouter } from 'next/navigation';
import HistoryScreen from '@/components/history/HistoryScreen';

export default function HistoryPageClient({ userId }: { userId: string }) {
  const router = useRouter();
  return <HistoryScreen userId={userId} onSelectSession={(id) => router.push(`/workout/${id}`)} />;
}
