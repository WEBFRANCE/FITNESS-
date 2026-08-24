import { create } from 'zustand';
import { db, type LocalDailyLog } from '@/lib/db/dexie';
import { queueChange } from '@/lib/sync/syncEngine';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function uuid(): string {
  return crypto.randomUUID();
}

async function persist(log: LocalDailyLog) {
  await db.dailyLogs.put(log);
  await queueChange('dailyLogs', 'insert', log.id, {
    id: log.id,
    user_id: log.userId,
    date: log.date,
    sleep_hours: log.sleepHours ?? null,
    sleep_quality: log.sleepQuality ?? null,
    fatigue_level: log.fatigueLevel ?? null,
    nutrition: log.nutrition ?? null,
  });
}

interface DailyLogState {
  log: LocalDailyLog | null;
  isLoading: boolean;
  loadToday: (userId: string) => Promise<void>;
  updateSleep: (sleepHours: number, sleepQuality: number) => Promise<void>;
  updateFatigue: (fatigueLevel: number) => Promise<void>;
  updateNutrition: (nutrition: NonNullable<LocalDailyLog['nutrition']>) => Promise<void>;
}

export const useDailyLogStore = create<DailyLogState>((set, get) => ({
  log: null,
  isLoading: false,

  loadToday: async (userId) => {
    set({ isLoading: true });
    const date = todayKey();
    // .and() plutôt que .where({userId, date}) : ne dépend pas d'un index
    // composé déclaré, juste du index simple userId déjà présent.
    const existing = await db.dailyLogs
      .where('userId')
      .equals(userId)
      .and((l) => l.date === date)
      .first();

    set({
      log: existing ?? { id: uuid(), userId, date, updatedAt: Date.now() },
      isLoading: false,
    });
  },

  updateSleep: async (sleepHours, sleepQuality) => {
    const { log } = get();
    if (!log) return;
    const next = { ...log, sleepHours, sleepQuality, updatedAt: Date.now() };
    set({ log: next });
    await persist(next);
  },

  updateFatigue: async (fatigueLevel) => {
    const { log } = get();
    if (!log) return;
    const next = { ...log, fatigueLevel, updatedAt: Date.now() };
    set({ log: next });
    await persist(next);
  },

  updateNutrition: async (nutrition) => {
    const { log } = get();
    if (!log) return;
    const next = { ...log, nutrition: { ...log.nutrition, ...nutrition }, updatedAt: Date.now() };
    set({ log: next });
    await persist(next);
  },
}));
