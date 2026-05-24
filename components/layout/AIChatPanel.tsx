'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Settings, Loader2, Sparkles } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key') ?? '';
    setSavedKey(stored);
    setApiKey(stored);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setSavedKey(apiKey);
    setShowSettings(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      // Get RAG context
      const ctxRes = await fetch('/api/ai/get-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: currentInput }),
      });
      const { chunks } = await ctxRes.json();

      const contextText = chunks?.length
        ? `Context from study materials:\n${chunks
            .map((c: { title: string; snippet: string }) => `[${c.title}]: ${c.snippet}`)
            .join('\n\n')}`
        : '';

      const prompt = contextText
        ? `You are an academic study assistant for VJIT engineering students.\n\n${contextText}\n\nStudent question: ${currentInput}`
        : `You are an academic study assistant for VJIT engineering students. Answer helpfully and concisely.\n\nStudent question: ${currentInput}`;

      // Call our secure server-side AI chat proxy
      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          apiKey: savedKey,
        }),
      });

      const chatData = await chatRes.json();
      if (!chatRes.ok) {
        throw new Error(chatData.error ?? 'AI Assistant failed to respond');
      }

      const assistantMsg: Message = { role: 'assistant', content: chatData.text };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('[AIChatPanel]', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Failed to generate response. Check your Gemini API key in settings.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl gradient-accent text-white shadow-lg glow-accent flex items-center justify-center z-50"
        aria-label="Open AI Assistant"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Bot className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            className="fixed bottom-20 md:bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[480px] sm:h-[520px] glass-strong rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-custom">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-sm text-primary">AI Study Assistant</span>
                {savedKey && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-custom transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-custom transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Settings overlay */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="px-4 py-3 border-b border-custom bg-card-custom"
                >
                  <p className="text-xs font-medium text-secondary mb-2">Gemini API Key</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-zinc-900 border border-custom text-primary placeholder:text-muted-custom focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={saveApiKey}
                      className="px-3 py-1.5 text-xs rounded-lg gradient-accent text-white font-medium"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-custom mt-1.5">
                    Stored in your browser only. Get a key from{' '}
                    <a href="https://aistudio.google.com" target="_blank" className="text-indigo-400 hover:underline">
                      aistudio.google.com
                    </a>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <Bot className="w-8 h-8 text-indigo-400 mb-3" />
                  <p className="text-sm font-medium text-primary">Ask me anything</p>
                  <p className="text-xs text-secondary mt-1">
                    {savedKey
                      ? 'Powered by Gemini · Context-aware from your study materials'
                      : 'Add your Gemini API key in Settings ⚙️'}
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'gradient-accent text-white'
                        : 'bg-card-custom border border-custom text-primary'
                    }`}
                  >
                    {msg.content || (
                      <span className="flex items-center gap-1.5 text-muted-custom">
                        <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {loading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl bg-card-custom border border-custom text-xs text-muted-custom flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-custom">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask a question..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-card-custom border border-custom text-primary placeholder:text-muted-custom focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="p-2 rounded-xl gradient-accent text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
