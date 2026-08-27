'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot, Send, Settings, Loader2, Sparkles, Globe, CheckCircle2,
  ArrowRight, Menu, Clock, Trash, X, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { toast } from '@/components/ui/toaster';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  queryLogId?: string | null;
  feedback?: 'up' | 'down' | null;
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
    .replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br><br>');
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSetupScreen, setShowSetupScreen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [keyErrorMessage, setKeyErrorMessage] = useState('');
  const [keyProblem, setKeyProblem] = useState(false);
  const [hasOpenedStudio, setHasOpenedStudio] = useState(false);
  
  // History sidebar panel states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  // RAG Auto-scoping & Search All toggle states
  const [userBranch, setUserBranch] = useState<string>('');
  const [userSemester] = useState<number>(4);
  const [searchAll, setSearchAll] = useState<boolean>(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.branch) setUserBranch(data.branch);
      })
      .catch((err) => console.error('[AI Auth Error]', err));
  }, []);

  useEffect(() => {
    const key = localStorage.getItem('gemini_api_key') || '';
    setSavedKey(key);

    const savedSessionsRaw = localStorage.getItem('vjit_ai_sessions');
    if (savedSessionsRaw) {
      try {
        const parsed: ChatSession[] = JSON.parse(savedSessionsRaw);
        setSessions(parsed);
        if (parsed.length > 0) {
          const mostRecent = parsed[0];
          setCurrentSessionId(mostRecent.id);
          setMessages(mostRecent.messages);
          setHistory(mostRecent.history || []);
        } else {
          startNewChat();
        }
      } catch (err) {
        console.error(err);
        startNewChat();
      }
    } else {
      startNewChat();
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      setKeyErrorMessage('Please enter an API key');
      return;
    }

    const candidate = apiKey.trim();
    localStorage.setItem('gemini_api_key', candidate);
    setSavedKey(candidate);
    setApiKey(candidate);
    setKeyErrorMessage('');
    setKeyProblem(false);
    setShowSetupScreen(false);
    toast({ title: 'JARVIS activated!', description: 'Ask me anything.' });
  };

  const removeApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setSavedKey('');
    setApiKey('');
    setKeyErrorMessage('');
    setKeyProblem(false);
    setShowSetupScreen(true);
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

    const firstUserMsg = msgs.find((m) => m.role === 'user')?.content || '';
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

    const updated = [newSession, ...currentSessions.filter((s) => s.id !== id)]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    localStorage.setItem('vjit_ai_sessions', JSON.stringify(updated));
    setSessions(updated);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== id);
    localStorage.setItem('vjit_ai_sessions', JSON.stringify(updated));
    setSessions(updated);

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

  const handleFeedback = async (msgIdx: number, queryLogId: string | null | undefined, verdict: 'up' | 'down') => {
    if (!queryLogId) return;

    setMessages((prev) =>
      prev.map((msg, i) => (i === msgIdx ? { ...msg, feedback: verdict } : msg))
    );

    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryLogId, verdict }),
      });
      toast({
        title: verdict === 'up' ? 'Thanks for the feedback! 👍' : 'Feedback recorded 👎',
        description: verdict === 'down' ? 'We logged this to improve study corpus grounding.' : undefined,
      });
    } catch (err) {
      console.error('[Feedback Error]', err);
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
      const ctxRes = await fetch('/api/ai/get-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentInput,
          searchAll,
          ...(searchAll ? {} : { branch: userBranch, semester: userSemester }),
        }),
      });

      const { chunks, grounded, queryLogId } = await ctxRes.json();

      let contextText = '';
      if (grounded && chunks?.length) {
        contextText = `Context from study materials:\n${chunks
          .map(
            (c: { fileName: string; pageNumber?: number | null; webViewLink: string; text: string }) => {
              const pageTag = c.pageNumber != null ? ` (Page ${c.pageNumber})` : '';
              return `[Source: ${c.fileName}${pageTag} | Link: ${c.webViewLink}]:\n${c.text}`;
            }
          )
          .join('\n\n')}`;
      } else {
        contextText = `NOTICE: No direct study materials were found matching score threshold >= 0.6. You MUST begin your response with "I don't have study material on this in your subjects, but based on general academic knowledge:" before answering.`;
      }

      const prompt = `You are an academic study assistant for VJIT engineering students.\n\n${contextText}\n\nStudent question: ${currentInput}`;

      const nextHistory = [...history, { role: 'user', parts: [{ text: prompt }] }];
      saveSession(currentSessionId, nextMessages, nextHistory);

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

      const assistantMsg: Message = {
        role: 'assistant',
        content: chatData.text,
        queryLogId: queryLogId || null,
      };

      const finalMessages = [...nextMessages, assistantMsg];
      const finalHistory = [...nextHistory, { role: 'model', parts: [{ text: chatData.text }] }];
      
      setMessages(finalMessages);
      setHistory(finalHistory);
      setKeyProblem(false);
      
      saveSession(currentSessionId, finalMessages, finalHistory);
    } catch (err: any) {
      console.error('[AIPage Chat Error]', err);
      const messageText = err.message || 'Failed to generate response. Check your Gemini API key in settings.';
      const finalMessages = [
        ...nextMessages,
        {
          role: 'assistant' as const,
          content: `⚠️ Error: ${messageText}`,
        }
      ];
      const isKeyIssue = /(invalid|restricted|quota|auth|key)/i.test(messageText);
      if (isKeyIssue) setKeyProblem(true);
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

  const showSetup = !savedKey || showSetupScreen;
  const step1Complete = hasOpenedStudio;
  const step2Complete = apiKey.trim().length > 0;
  const step3Complete = apiKey.trim().length > 0;
  const step4Complete = Boolean(savedKey);

  return (
    <div className="flex flex-grow flex-1 min-h-[calc(100vh-6rem)] md:min-h-[calc(100vh-2rem)] h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] max-w-6xl w-full mx-auto px-2 md:px-8 py-2 md:py-4 gap-4 overflow-hidden relative">
      {/* Sidebar Panel */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 border-none'
        } transition-all duration-300 flex flex-col bg-card-custom border border-custom rounded-2xl p-3 overflow-hidden flex-shrink-0 relative hidden md:flex`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-custom mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Chat History</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-zinc-800 text-secondary hover:text-primary transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={startNewChat}
          className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-xl gradient-accent text-white text-xs font-semibold shadow-sm hover:opacity-90 transition cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" /> New Chat
        </button>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          {sessions.length === 0 ? (
            <p className="text-xs text-muted-custom text-center py-6">No previous chats yet.</p>
          ) : (
            sessions.map((s) => {
              const isActive = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setMessages(s.messages);
                    setHistory(s.history || []);
                  }}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium'
                      : 'hover:bg-zinc-800/60 text-secondary hover:text-primary'
                  }`}
                >
                  <span className="truncate pr-2">{s.title}</span>
                  <button
                    onClick={(e) => deleteSession(s.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-muted-custom transition"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-card-custom border border-custom rounded-2xl p-4 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-custom mb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="hidden md:flex p-1.5 rounded-xl hover:bg-zinc-800 text-secondary hover:text-primary border border-custom"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-primary flex items-center gap-1.5">
                VJIT JARVIS <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">Active</span>
              </h1>
              <p className="text-[11px] text-muted-custom">AI Study Assistant & RAG Knowledge Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Scoping Toggle */}
            <div className="flex items-center gap-2 bg-zinc-950/60 border border-custom px-3 py-1.5 rounded-xl text-xs">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-secondary font-medium">Search All Corpus</span>
              <input
                type="checkbox"
                checked={searchAll}
                onChange={(e) => setSearchAll(e.target.checked)}
                className="rounded border-custom text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <button
              onClick={() => setShowSetupScreen(!showSetupScreen)}
              className="p-2 rounded-xl border border-custom hover:bg-zinc-800 text-secondary hover:text-primary transition cursor-pointer"
              title="Settings & Key"
            >
              <Settings className="w-4 h-4" />
            </button>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 rounded-xl border border-custom hover:bg-zinc-800 text-secondary hover:text-primary transition cursor-pointer"
                title="Clear current chat"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Body */}
        {showSetup ? (
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin">
            <div className="max-w-2xl mx-auto py-6">
              <div className="rounded-3xl border border-custom bg-card-custom p-6 md:p-8 shadow-xl">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-primary">Activate VJIT JARVIS</h2>
                    <p className="text-sm text-secondary mt-1">
                      Enter your free Gemini API key to activate your personal AI academic tutor.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className={`rounded-3xl border p-5 ${step1Complete ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-custom bg-zinc-950/60'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${step1Complete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900 text-indigo-400'}`}>
                            {step1Complete ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">1</span>}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-primary">STEP 1</h3>
                            <p className="text-sm text-secondary">Open Google AI Studio</p>
                          </div>
                        </div>
                        {step1Complete && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setHasOpenedStudio(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
                      >
                        Open Google AI Studio <ArrowRight className="w-4 h-4" />
                      </a>
                    </div>

                    <div className={`rounded-3xl border p-5 ${step2Complete ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-custom bg-zinc-950/60'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${step2Complete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900 text-indigo-400'}`}>
                            {step2Complete ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">2</span>}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-primary">STEP 2</h3>
                            <p className="text-sm text-secondary">Create your API Key</p>
                          </div>
                        </div>
                        {step2Complete && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                    </div>

                    <div className={`rounded-3xl border p-5 ${step3Complete ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-custom bg-zinc-950/60'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${step3Complete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900 text-indigo-400'}`}>
                            {step3Complete ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">3</span>}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-primary">STEP 3</h3>
                            <p className="text-sm text-secondary">Copy your API Key</p>
                          </div>
                        </div>
                        {step3Complete && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                    </div>

                    <div className={`rounded-3xl border p-5 ${step4Complete ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-custom bg-zinc-950/60'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${step4Complete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-900 text-indigo-400'}`}>
                            {step4Complete ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-bold">4</span>}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-primary">STEP 4</h3>
                            <p className="text-sm text-secondary">Paste it below and click Activate</p>
                          </div>
                        </div>
                        {step4Complete && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      </div>
                      <div className="mt-4 space-y-3">
                        <input
                          type="text"
                          value={apiKey}
                          onChange={(e) => { setApiKey(e.target.value); setKeyErrorMessage(''); }}
                          placeholder="Paste your API key here"
                          className="w-full rounded-xl border border-custom bg-zinc-950/60 px-4 py-3 text-sm text-primary placeholder:text-muted-custom focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        {keyErrorMessage && (
                          <p className="text-sm text-rose-400">{keyErrorMessage}</p>
                        )}
                        <button
                          onClick={saveApiKey}
                          className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-sm font-semibold text-zinc-950 px-4 py-3 shadow-sm"
                        >
                          Activate JARVIS
                        </button>
                        {savedKey && (
                          <button
                            onClick={removeApiKey}
                            className="w-full rounded-xl border border-red-500/30 bg-red-500/5 text-sm font-semibold text-red-300 px-4 py-3 hover:bg-red-500/10 transition"
                          >
                            Remove API Key
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {keyProblem && (
              <button
                onClick={() => setShowSetupScreen(true)}
                className="mb-4 w-full rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-sm text-amber-300 hover:border-amber-400 hover:text-white transition"
              >
                Your API key has an issue. Click here to update it.
              </button>
            )}
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
                    className={`max-w-[85%] md:max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed relative group ${
                      msg.role === 'user'
                        ? 'gradient-accent text-white shadow-md'
                        : 'bg-card-custom border border-custom text-primary'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.content ? (
                      <div>
                        <div
                          className="prose prose-invert text-xs sm:text-sm space-y-2"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                        {/* 1-Click Thumbs Up / Down Feedback Bar */}
                        {msg.queryLogId && (
                          <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center gap-3 text-xs text-muted-custom">
                            <span className="text-[11px]">Was this helpful?</span>
                            <button
                              onClick={() => handleFeedback(i, msg.queryLogId, 'up')}
                              className={`p-1 rounded hover:bg-zinc-800 transition ${
                                msg.feedback === 'up' ? 'text-emerald-400 font-bold' : 'text-zinc-400 hover:text-emerald-400'
                              }`}
                              title="Thumbs up"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(i, msg.queryLogId, 'down')}
                              className={`p-1 rounded hover:bg-zinc-800 transition ${
                                msg.feedback === 'down' ? 'text-rose-400 font-bold' : 'text-zinc-400 hover:text-rose-400'
                              }`}
                              title="Thumbs down"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
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

            <div className="flex-shrink-0 pt-2 border-t border-custom flex items-center gap-2">
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
                className="w-11 h-11 flex-shrink-0 rounded-xl gradient-accent text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
