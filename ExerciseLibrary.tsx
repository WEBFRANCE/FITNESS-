'use client';

/**
 * Bibliothèque d'exercices : recherche + filtres par catégorie/muscle sur
 * les 500+ exercices (curés + importés), et création d'exercices custom
 * (stockés localement, is_custom=true, invisibles pour les autres
 * utilisateurs — cf. policy RLS "insert_own_custom" du premier message).
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { db, type LocalExercise } from '@/lib/db/dexie';
import { queueChange } from '@/lib/sync/syncEngine';
import { GlassCard, GlassSheet, GlassButton } from '@/components/ui/GlassPrimitives';

const CATEGORY_LABELS: Record<LocalExercise['category'], string> = {
  poids_libres: 'Poids libres',
  machine: 'Machine',
  poids_du_corps: 'Poids du corps',
  cardio: 'Cardio',
};

function uuid(): string {
  return crypto.randomUUID();
}

export default function ExerciseLibrary({
  userId,
  onSelect,
}: {
  userId: string;
  /** Si fourni, la carte devient sélectionnable (ajout à une séance/routine) plutôt que juste consultable. */
  onSelect?: (exercise: LocalExercise) => void;
}) {
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<LocalExercise['category'] | 'toutes'>('toutes');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void db.exercises.toArray().then(setExercises);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesCategory = category === 'toutes' || ex.category === category;
      const matchesSearch = query === '' || ex.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [exercises, search, category]);

  async function createCustomExercise(name: string, exerciseCategory: LocalExercise['category']) {
    const id = uuid();
    const exercise: LocalExercise = {
      id,
      name,
      category: exerciseCategory,
      primaryMuscles: [],
      secondaryMuscles: [],
      isCustom: true,
      createdBy: userId,
      updatedAt: Date.now(),
    };

    await db.exercises.put(exercise);
    await queueChange('exercises', 'insert', id, {
      id,
      name,
      category: exerciseCategory,
      primary_muscles: [],
      secondary_muscles: [],
      is_custom: true,
      created_by: userId,
    });

    setExercises((prev) => [...prev, exercise]);
    setCreating(false);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5" data-clarity="balanced">
        <Search className="h-4 w-4 opacity-40" strokeWidth={1.5} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un exercice"
          className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} aria-label="Effacer">
            <X className="h-4 w-4 opacity-40" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['toutes', 'poids_libres', 'machine', 'poids_du_corps', 'cardio'] as const).map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
              category === cat ? 'bg-accent text-black' : 'glass'
            }`}
          >
            {cat === 'toutes' ? 'Toutes' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <p className="px-1 text-xs opacity-40">{filtered.length} exercice{filtered.length > 1 ? 's' : ''}</p>

      <div className="flex flex-col gap-2">
        {filtered.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => onSelect?.(exercise)}
            className="text-left"
            disabled={!onSelect}
          >
            <GlassCard className="flex items-center justify-between !p-3.5">
              <div>
                <p className="text-sm font-medium">{exercise.name}</p>
                <p className="text-xs opacity-40">
                  {CATEGORY_LABELS[exercise.category]}
                  {exercise.primaryMuscles.length > 0 ? ` · ${exercise.primaryMuscles.join(', ')}` : ''}
                </p>
              </div>
              {exercise.isCustom && (
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide opacity-50">
                  Perso
                </span>
              )}
            </GlassCard>
          </button>
        ))}
      </div>

      <GlassButton variant="accent" className="mt-2" onClick={() => setCreating(true)}>
        <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
        Créer un exercice
      </GlassButton>

      <CreateExerciseSheet open={creating} onClose={() => setCreating(false)} onCreate={createCustomExercise} />
    </div>
  );
}

function CreateExerciseSheet({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, category: LocalExercise['category']) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LocalExercise['category']>('poids_libres');

  return (
    <GlassSheet open={open} onClose={onClose} title="Nouvel exercice">
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-xs opacity-60">
          Nom
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Développé Smith machine unilatéral"
            className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-base text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABELS) as LocalExercise['category'][]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium ${
                category === cat ? 'bg-accent text-black' : 'bg-white/[0.04]'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <GlassButton
          variant="accent"
          disabled={name.trim().length === 0}
          onClick={() => {
            onCreate(name.trim(), category);
            setName('');
          }}
        >
          Ajouter à ma bibliothèque
        </GlassButton>
      </div>
    </GlassSheet>
  );
}
