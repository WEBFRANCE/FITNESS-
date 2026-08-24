import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { buildVisionSystemPrompt } from '@/lib/ai/prompts';

const anthropic = new Anthropic();

// ⚠️ À sécuriser en amont : vérifier que l'utilisateur authentifié de la
// requête est bien le propriétaire de la photo analysée (RLS côté storage
// + vérification de session ici). Ces photos sont sensibles.
export async function POST(req: Request) {
  const { imageBase64, mediaType, previousNotes } = (await req.json()) as {
    imageBase64: string;
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
    previousNotes?: string;
  };

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 800,
    system: buildVisionSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          {
            type: 'text',
            text: previousNotes
              ? `Photo précédente pour comparaison : ${previousNotes}\n\nAnalyse cette nouvelle photo.`
              : 'Analyse cette photo (première photo de référence, pas de comparaison possible).',
          },
        ],
      },
    ],
  });

  const analysis = message.content.find((b) => b.type === 'text');
  return NextResponse.json({ analysis: analysis && 'text' in analysis ? analysis.text : '' });
}
