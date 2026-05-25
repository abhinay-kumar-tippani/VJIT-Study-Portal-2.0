'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Send, Settings, Loader2, Sparkles, Key,
  ArrowRight, Trash2, Menu, Clock, Trash, X
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  history: any[];
  timestamp: number;
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\* (.+)/gm, '<li>$1</li>')
    .replace(/^- (.+)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br><br>');
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  
  // History sidebar panel states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize and load saved sessions
  useEffect(() => {
    // 0. Close sidebar by default on mobile
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    // 1. Fetch Gemini key
    const stored = localStorage.getItem('gemini_api_key') ?? '';
    setSavedKey(stored);
    setApiKey(stored);

    // 2. Fetch saved sessions
    const savedSessionsRaw = localStorage.getItem('vjit_ai_sessions');
    let loadedSessions: ChatSession[] = [];
    if (savedSessionsRaw) {
      try {
        loadedSessions = JSON.parse(savedSessionsRaw);
      } catch (e) {
        console.error('[Contribute Load Sessions]', e);
      }
    }
    setSessions(loadedSessions);

    // 3. Load the most recent session or start a new one
    if (loadedSessions.length > 0) {
      const mostRecent = loadedSessions[0];
      setCurrentSessionId(mostRecent.id);
      setMessages(mostRecent.messages);
      setHistory(mostRecent.history || []);
    } else {
      startNewChat();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    setSavedKey(apiKey);
    setShowSettings(false);
  };

  const startNewChat = () => {
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setMessages([]);
    setHistory([]);
  };

  const clearChat = () => {
    startNewChat();
  };

  const saveSession = (id: string, msgs: Message[], hist: any[]) => {
    if (msgs.length === 0) return;

    // Auto-generate title from the first user message
    const firstUserMsg = msgs.find((m) => m.role === 'user')?.content || '';
    
    // Clean up first user message if it contains RAG prompt headers
    let cleanPrompt = firstUserMsg;
    if (firstUserMsg.includes('Student question:')) {
      cleanPrompt = firstUserMsg.split('Student question:').pop()?.trim() || firstUserMsg;
    }
    if (cleanPrompt.includes('Context from study materials:')) {
      cleanPrompt = 'Study Materials Chat';
    }
    
    const cleanTitle = cleanPrompt.length > 40 ? cleanPrompt.slice(0, 40) + '...' : cleanPrompt;

    const savedSessionsRaw = localStorage.getItem('vjit_ai_sessions');
    let currentSessions: ChatSession[] = [];
    if (savedSessionsRaw) {
      try {
        currentSessions = JSON.parse(savedSessionsRaw);
      } catch (e) {
        console.error(e);
      }
    }

    const newSession: ChatSession = {
      id,
      title: cleanTitle || 'New Chat',
      messages: msgs,
      history: hist,
      timestamp: Date.now(),
    };

    // Filter out duplicates and append
    const updated = [newSession, ...currentSessions.filter((s) => s.id !== id)]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20); // max 20 recent chats

    localStorage.setItem('vjit_ai_sessions', JSON.stringify(updated));
    setSessions(updated);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent loading the deleted session
    const updated = sessions.filter((s) => s.id !== id);
    localStorage.setItem('vjit_ai_sessions', JSON.stringify(updated));
    setSessions(updated);

    // If we deleted the currently active session, start a new one or load the next available
    if (currentSessionId === id) {
      if (updated.length > 0) {
        const nextActive = updated[0];
        setCurrentSessionId(nextActive.id);
        setMessages(nextActive.messages);
        setHistory(nextActive.history || []);
      } else {
        startNewChat();
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    
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

      const nextHistory = [...history, { role: 'user', parts: [{ text: prompt }] }];
      
      // Save session with user prompt in history
      saveSession(currentSessionId, nextMessages, nextHistory);

      // Call our secure server-side AI chat proxy
      const chatRes = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: nextHistory,
          apiKey: savedKey,
        }),
      });

      const chatData = await chatRes.json();
      if (!chatRes.ok) {
        throw new Error(chatData.error ?? 'AI Assistant failed to respond');
      }

      const assistantMsg: Message = { role: 'assistant', content: chatData.text };
      const finalMessages = [...nextMessages, assistantMsg];
      const finalHistory = [...nextHistory, { role: 'model', parts: [{ text: chatData.text }] }];
      
      setMessages(finalMessages);
      setHistory(finalHistory);
      
      // Save session with assistant reply
      saveSession(currentSessionId, finalMessages, finalHistory);
    } catch (err: any) {
      console.error('[AIPage Chat Error]', err);
      const finalMessages = [
        ...nextMessages,
        {
          role: 'assistant' as const,
          content: `⚠️ Error: ${err.message || 'Failed to generate response. Check your Gemini API key in settings.'}`,
        }
      ];
      setMessages(finalMessages);
      saveSession(currentSessionId, finalMessages, history);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `
    w-full px-4 py-3 rounded-xl bg-card-custom border border-custom
    text-primary placeholder:text-muted-custom text-sm
    focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
    transition-all duration-150
  `;

  return (
    <div className="flex flex-grow flex-1 min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-2rem)] h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] max-w-6xl w-full mx-auto px-2 md:px-8 py-2 md:py-4 gap-4 overflow-hidden relative">
      
      {/* Backdrop overlay for mobile when sidebar is open */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-10 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* 1. Left Chat History Sidebar Panel */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 260 }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ type: 'spring', bounce: 0.1, duration: 0.3 }}
            className="flex-shrink-0 bg-card-custom border border-custom rounded-r-2xl md:rounded-2xl p-4 flex flex-col h-full overflow-hidden fixed md:relative z-20 left-0 md:left-0 top-0 md:top-0 bottom-0 md:bottom-0 shadow-2xl md:shadow-none border-l-0 md:border-l"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" /> Recent Chats
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-custom border border-custom transition-all md:hidden cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={startNewChat}
              className="w-full mb-3 py-2.5 px-3 rounded-xl text-xs font-bold gradient-accent text-white flex items-center justify-center gap-1.5 glow-accent cursor-pointer flex-shrink-0"
            >
               New Chat
            </button>

            {/* Scrollable list of recent chats */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-custom">
                  No recent conversations.
                </div>
              ) : (
                sessions.map((s) => {
                  const isActive = currentSessionId === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setCurrentSessionId(s.id);
                        setMessages(s.messages);
                        setHistory(s.history || []);
                      }}
                      className={`
                        group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150
                        ${isActive
                          ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
                          : 'bg-card-custom border border-custom text-secondary hover:text-primary hover:bg-zinc-900/50'
                        }
                      `}
                    >
                      <div className="truncate pr-4 flex-1">
                        {s.title}
                      </div>
                      <button
                        onClick={(e) => deleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-muted-custom hover:text-red-400 transition-all absolute right-2 top-1.5"
                        title="Delete Chat"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Chat Panel */}
      <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden min-w-0">
        {/* Premium Header */}
        <div className="flex items-center justify-between pb-4 border-b border-custom mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-card-custom border border-custom transition-all cursor-pointer"
              title="Toggle Chat History"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center glow-accent">
              <Bot className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-primary flex items-center gap-2">
                JARVIS
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              </h1>
              <p className="text-xs text-secondary mt-0.5 hidden sm:block">your ai personal assistant answers all your academic doubts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedKey && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="hidden sm:inline">Active Key</span>
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl text-secondary hover:text-primary hover:bg-card-custom border border-custom transition-all cursor-pointer"
              aria-label="API Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Settings Overlay Drawer */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border border-custom rounded-2xl bg-card-custom p-4 mb-4 flex-shrink-0"
            >
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-semibold text-primary">Gemini API Key Configuration</h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-900 border border-custom text-primary placeholder:text-muted-custom focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={saveApiKey}
                  className="px-4 py-2 text-xs rounded-xl gradient-accent text-white font-semibold shadow-md cursor-pointer"
                >
                  Save Key
                </button>
              </div>
              <p className="text-[11px] text-secondary mt-2.5 flex flex-wrap items-center gap-1">
                Stored securely in your local browser only. Acquire a free key at{' '}
                <a href="https://aistudio.google.com" target="_blank" className="text-indigo-400 hover:underline inline-flex items-center gap-0.5">
                  aistudio.google.com <ArrowRight className="w-2.5 h-2.5" />
                </a>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto min-h-0 mb-4 space-y-4 pr-1.5 scrollbar-thin">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 animate-bounce">
                <Bot className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-primary mb-1">Your Personal Academic Tutor</h2>
              <p className="text-xs text-secondary leading-relaxed">
                Ask queries about your VJIT syllabus, request exam question trends, or summarize files.
                The AI will automatically pull contexts from your uploaded branch notes!
              </p>
              {!savedKey && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="mt-4 px-4 py-2 rounded-xl glass border border-custom text-xs font-semibold text-indigo-400 hover:text-primary transition-all cursor-pointer"
                >
                  Add Gemini API Key to Start
                </button>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'gradient-accent text-white shadow-md'
                    : 'bg-card-custom border border-custom text-primary'
                }`}
              >
                {msg.role === 'assistant' && msg.content ? (
                  <div 
                    className="prose prose-invert text-xs sm:text-sm space-y-2"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} 
                  />
                ) : (
                  msg.content || (
                    <span className="flex items-center gap-1.5 text-muted-custom">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
                    </span>
                  )
                )}
              </div>
            </motion.div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl bg-card-custom border border-custom text-sm text-muted-custom flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input Message Bar */}
        <div className="flex-shrink-0 pt-2 border-t border-custom flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask JARVIS or search notes..."
            className={`${inputClass} flex-1`}
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="px-4.5 rounded-xl gradient-accent text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
