'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassButton } from '@/components/ui/GlassPrimitives';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink() {
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-base)] p-6 text-[var(--text-primary)]">
      <h1 className="text-2xl font-semibold">Cercle privé</h1>

      {sent ? (
        <p className="text-center text-sm opacity-70">Lien envoyé à {email}. Vérifiez votre boîte mail.</p>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="rounded-2xl bg-white/[0.04] px-4 py-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          />
          <GlassButton variant="accent" disabled={!email.includes('@')} onClick={sendMagicLink}>
            Recevoir le lien de connexion
          </GlassButton>
          {error && <p className="text-center text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
