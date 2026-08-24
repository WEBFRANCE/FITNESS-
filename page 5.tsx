'use client';

/**
 * ⚠️ Rappel schéma : la table `profiles` est indexée par `id` (= auth.uid()
 * directement, pas de colonne user_id séparée), contrairement au pattern
 * "own_rows" via user_id décrit pour les autres tables au premier message.
 * Sa policy RLS doit donc être :
 *   create policy "own_profile" on profiles
 *     for all using (auth.uid() = id) with check (auth.uid() = id);
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import SettingsScreen, { type ModuleToggles } from '@/components/settings/SettingsScreen';

const DEFAULT_MODULES: ModuleToggles = {
  nutrition: false,
  sleep: false,
  fatigue: false,
  measurements: true,
};

export default function SettingsPage() {
  const [modules, setModules] = useState<ModuleToggles>(DEFAULT_MODULES);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      void supabase
        .from('profiles')
        .select('active_modules')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.active_modules) setModules({ ...DEFAULT_MODULES, ...data.active_modules });
        });
    });
  }, []);

  async function handleModulesChange(next: ModuleToggles) {
    setModules(next); // réactif immédiatement, persistance en tâche de fond
    if (!userId) return;
    const supabase = createClient();
    await supabase.from('profiles').update({ active_modules: next }).eq('id', userId);
  }

  return <SettingsScreen modules={modules} onModulesChange={handleModulesChange} />;
}
