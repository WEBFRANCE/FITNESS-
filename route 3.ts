import Anthropic from '@anthropic-ai/sdk';
import { buildCoachSystemPrompt, type CoachContext } from '@/lib/ai/prompts';

const anthropic = new Anthropic(); // lit ANTHROPIC_API_KEY depuis l'environnement serveur

export async function POST(req: Request) {
  const { messages, context } = (await req.json()) as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    context: CoachContext;
  };

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system: buildCoachSystemPrompt(context),
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
