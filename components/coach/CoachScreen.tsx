'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import ChatBubble, { type ChatMessage } from './ChatBubble';
import { buildTrainingSummary } from '@/lib/ai/buildTrainingSummary';
import type { CoachContext } from '@/lib/ai/prompts';

export default function CoachScreen({
  userId,
  displayName,
  routineName,
  goal,
}: {
  userId: string;
  displayName?: string;
  routineName?: string;
  goal?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages([...nextMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const recentSummary = await buildTrainingSummary(userId, 30);
      const context: CoachContext = { displayName, recentSummary, routineName, goal };

      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, context }),
      });

      if (!res.ok || !res.body) throw new Error('Réponse invalide du coach');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? ''; // segment potentiellement incomplet, conservé pour le tour suivant

        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue;
          const payload = chunk.slice(6);
          if (payload === '[DONE]') continue;

          const { text: delta } = JSON.parse(payload) as { text: string };
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + delta };
            return updated;
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: "Désolé, je n'ai pas pu répondre — réessayez.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, messages, userId, displayName, routineName, goal]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      <header className="glass sticky top-0 z-10 px-5 pb-4 pt-6" data-clarity="balanced">
        <h1 className="text-lg font-semibold">Coach</h1>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-32">
        {messages.length === 0 && (
          <p className="pt-10 text-center text-sm opacity-40">
            Posez une question sur votre programme, vos charges, ou demandez un ajustement.
          </p>
        )}
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        <div ref={scrollRef} />
      </div>

      <div
        className="glass fixed inset-x-4 bottom-4 flex items-center gap-2 rounded-full p-2"
        data-clarity="opaque"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Écrire au coach…"
          className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:opacity-40"
        />
        <button
          type="button"
          onClick={send}
          disabled={streaming || input.trim().length === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-black disabled:opacity-40"
          aria-label="Envoyer"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
