'use client';
import { motion } from 'framer-motion';

export default function Message({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`card max-w-[85%] p-4 mb-3 ${isUser ? 'bg-indigo-600 text-white' : ''}`}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </motion.div>
  );
}
