'use client';

/**
 * Écran d'historique : liste des séances passées, groupées par mois,
 * avec résumé (volume, durée, PR du jour) et navigation vers le détail.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, Clock, Flame } from 'lucide-react';
import { db, type LocalWorkoutSession } from '@/lib/db/dexie';
import { GlassCard } from '@/components/ui/GlassPrimitives';

interface SessionSummary {
  session: LocalWorkoutSession;
  exerciseNames: string[];
  totalVolumeKg: number;
  prCount: number;
  durationMinutes: number | null;
}

async function loadSummaries(userId: string): Promise<SessionSummary[]> {
  // .sortBy() trie toujours en ordre croissant côté Dexie ; .reverse() sur
  // la Collection avant n'a aucun effet sur ce tri final — on inverse donc
  // le tableau JS obtenu, pas la Collection, pour avoir le plus récent en
  // premier.
  const sessions = (
    await db.workoutSessions
      .where('userId')
      .equals(userId)
      .and((s) => s.endedAt !== undefined)
      .sortBy('startedAt')
  ).reverse();

  return Promise.all(
    sessions.map(async (session) => {
      const sessionExercises = await db.sessionExercises.where('sessionId').equals(session.id).toArray();
      const exerciseNames: string[] = [];
      let totalVolumeKg = 0;
      let prCount = 0;

      for (const se of sessionExercises) {
        const exercise = await db.exercises.get(se.exerciseId);
        if (exercise) exerciseNames.push(exercise.name);
        const sets = await db.sets.where('sessionExerciseId').equals(se.id).toArray();
        totalVolumeKg += sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
        prCount += sets.filter((s) => s.isPR).length;
      }

      return {
        session,
        exerciseNames,
        totalVolumeKg: Math.round(totalVolumeKg),
        prCount,
        durationMinutes: session.endedAt ? Math.round((session.endedAt - session.startedAt) / 60000) : null,
      };
    })
  );
}

function groupByMonth(summaries: SessionSummary[]): [string, SessionSummary[]][] {
  const groups = new Map<string, SessionSummary[]>();
  for (const summary of summaries) {
    const label = new Date(summary.session.startedAt).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
    const existing = groups.get(label) ?? [];
    existing.push(summary);
    groups.set(label, existing);
  }
  return [...groups.entries()];
}

export default function HistoryScreen({
  userId,
  onSelectSession,
}: {
  userId: string;
  onSelectSession: (sessionId: string) => void;
}) {
  const [summaries, setSummaries] = useState<SessionSummary[] | null>(null);

  useEffect(() => {
    void loadSummaries(userId).then(setSummaries);
  }, [userId]);

  if (summaries === null) {
    return <p className="px-5 pt-10 text-center text-sm opacity-40">Chargement de l'historique…</p>;
  }

  if (summaries.length === 0) {
    return <p className="px-5 pt-10 text-center text-sm opacity-40">Aucune séance terminée pour l'instant.</p>;
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      {groupByMonth(summaries).map(([month, monthSummaries]) => (
        <div key={month}>
          <h2 className="mb-3 px-1 text-xs uppercase tracking-widest opacity-40">{month}</h2>
          <div className="flex flex-col gap-3">
            {monthSummaries.map(({ session, exerciseNames, totalVolumeKg, prCount, durationMinutes }) => (
              <motion.button
                key={session.id}
                type="button"
                onClick={() => onSelectSession(session.id)}
                whileTap={{ scale: 0.98 }}
                className="text-left"
              >
                <GlassCard>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">
                      {new Date(session.startedAt).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    {prCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-accent">
                        <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
                        {prCount}
                      </span>
                    )}
                  </div>
                  <p className="mb-3 truncate text-sm opacity-60">{exerciseNames.join(', ') || 'Séance vide'}</p>
                  <div className="flex gap-4 text-xs opacity-50">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {(totalVolumeKg / 1000).toFixed(1)}t
                    </span>
                    {durationMinutes !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {durationMinutes} min
                      </span>
                    )}
                  </div>
                </GlassCard>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
