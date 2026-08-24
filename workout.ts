export type SetType = 'warmup' | 'normal' | 'dropset';

export interface SetEntry {
  id: string;
  type: SetType;
  weight: number;
  reps: number;
  completed: boolean;
  isPR?: boolean;
  rpe?: number;
  timeUnderTensionSec?: number;
}

export interface ExerciseBlock {
  id: string;
  name: string;
  previousBest1RM?: number;
  sets: SetEntry[];
}
