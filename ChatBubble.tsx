'use client';

import { motion } from 'motion/react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className="glass max-w-[85%] whitespace-pre-wrap rounded-glass px-4 py-2.5 text-sm leading-relaxed"
        data-clarity={isUser ? 'balanced' : 'opaque'}
      >
        {message.content}
      </div>
    </motion.div>
  );
}
