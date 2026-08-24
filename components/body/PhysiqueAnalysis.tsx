'use client';

import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { GlassCard, GlassButton } from '@/components/ui/GlassPrimitives';

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(',');
      const mediaType = header.match(/data:(.*);base64/)?.[1] ?? 'image/jpeg';
      resolve({ base64, mediaType });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function PhysiqueAnalysis() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setPreview(URL.createObjectURL(file));

    try {
      const { base64, mediaType } = await fileToBase64(file);
      const res = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      if (!res.ok) throw new Error('Analyse indisponible');
      const data = (await res.json()) as { analysis: string };
      setAnalysis(data.analysis);
    } catch {
      setError("L'analyse a échoué — réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GlassCard className="flex flex-col gap-4">
      <div>
        <h3 className="mb-1 text-sm font-medium">Analyse physique</h3>
        <p className="text-xs opacity-50">Photo d'évolution — évaluation objective, sans complaisance.</p>
      </div>

      {preview && (
        // Aperçu local d'un blob créé par l'utilisateur : next/image n'apporte rien ici.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Aperçu de la photo" className="max-h-64 w-full rounded-2xl object-cover" />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <GlassButton variant="accent" onClick={() => inputRef.current?.click()} disabled={loading}>
        <Camera className="mr-1.5 h-4 w-4" strokeWidth={2} />
        {loading ? 'Analyse en cours…' : 'Prendre / choisir une photo'}
      </GlassButton>

      {error && <p className="text-center text-xs text-red-400">{error}</p>}

      {analysis && (
        <div className="glass whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed" data-clarity="opaque">
          {analysis}
        </div>
      )}
    </GlassCard>
  );
}
