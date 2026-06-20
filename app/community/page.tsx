'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Loader2, Reply, X, Trash2, ChevronUp, ShieldCheck,
  MessageCircle, Eye
} from 'lucide-react';
import { COMMUNITY_CONFIG } from '@/lib/community';
import { toast } from '@/components/ui/toaster';

// ─── Types ─────────────────────────────────────────────────────────
interface ReplyRef {
  messageId: string;
  authorName: string;
  snippet: string;
}

interface ViewInfo {
  rollNumber: string;
  name: string;
  viewedAt: string;
}

interface Message {
  _id: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'admin';
  text: string;
  replyTo?: ReplyRef;
  views?: ViewInfo[];
  createdAt: string;
}

interface CurrentUser {
  rollNumber: string;
  name: string;
  isAdmin: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────
function titleCase(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Deterministic hue from authorId so each user always gets the same avatar color. */
function getAvatarHue(authorId: string): number {
  let hash = 0;
  for (let i = 0; i < authorId.length; i++) {
    hash = authorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  // Same year? Show "Jun 18, 11:30 PM"
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Avatar component (reuses the gradient-accent from admin pills) ─
function Avatar({
  name,
  authorId,
  onClick,
}: {
  name: string;
  authorId: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  const hue = getAvatarHue(authorId);
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
      style={{ background: `hsl(${hue}, 55%, 45%)` }}
      title="Click to see roll number"
    >
      {getInitials(name)}
    </button>
  );
}

// ─── Roll number popover ───────────────────────────────────────────
function RollPopover({
  rollNumber,
  anchorRect,
  onClose,
}: {
  rollNumber: string;
  anchorRect: DOMRect;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.15 }}
      className="fixed z-[100] px-3 py-2 rounded-lg glass-strong border border-custom shadow-xl"
      style={{
        top: anchorRect.bottom + 6,
        left: anchorRect.left,
      }}
    >
      <p className="text-xs text-secondary">Roll Number</p>
      <p className="text-sm font-mono font-semibold text-primary">{rollNumber}</p>
    </motion.div>
  );
}

// ─── Single message bubble ─────────────────────────────────────────
function MessageBubble({
  msg,
  currentUser,
  onReply,
  onDelete,
  onShowViews,
}: {
  msg: Message;
  currentUser: CurrentUser | null;
  onReply: (msg: Message) => void;
  onDelete: (id: string) => void;
  onShowViews: (msg: Message) => void;
}) {
  const [popover, setPopover] = useState<DOMRect | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleAvatarClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover(popover ? null : rect);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="group flex gap-3 px-4 py-2.5 hover:bg-card-custom/30 transition-colors rounded-xl"
    >
      <Avatar name={msg.authorName} authorId={msg.authorId} onClick={handleAvatarClick} />

      <AnimatePresence>
        {popover && (
          <RollPopover
            rollNumber={msg.authorId}
            anchorRect={popover}
            onClose={() => setPopover(null)}
          />
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0">
        {/* Author line */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            onClick={handleAvatarClick}
            className="text-sm font-semibold text-primary cursor-pointer hover:text-[rgb(var(--accent-hover))] transition-colors"
            title="Click to see roll number"
          >
            {titleCase(msg.authorName)}
          </span>
          {msg.authorRole === 'admin' && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[rgb(var(--accent)_/_0.15)] text-[rgb(var(--accent-hover))] text-[10px] font-semibold">
              <ShieldCheck className="w-2.5 h-2.5" /> Admin
            </span>
          )}
          <span className="text-[11px] text-muted-custom">{formatTime(msg.createdAt)}</span>
        </div>

        {/* Reply reference */}
        {msg.replyTo && (
          <div className="mt-1 mb-1 pl-3 border-l-2 border-[rgb(var(--accent)_/_0.4)] text-xs text-secondary">
            <span className="font-medium text-[rgb(var(--accent-hover))]">{msg.replyTo.authorName}</span>
            <span className="text-muted-custom ml-1">— {msg.replyTo.snippet}</span>
          </div>
        )}

        {/* Message text */}
        <p className="text-sm text-secondary mt-0.5 break-words whitespace-pre-wrap max-w-[85%]">{msg.text}</p>

        {/* Actions — always visible on touch devices */}
        <div className="flex items-center gap-1 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onReply(msg)}
            className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-muted-custom hover:text-[rgb(var(--accent-hover))] hover:bg-[rgb(var(--accent)_/_0.1)] transition-all"
            title="Reply"
          >
            <Reply className="w-4 h-4" />
          </button>

          {currentUser?.isAdmin && msg.views && (
            <button
              onClick={() => onShowViews(msg)}
              className="min-h-[44px] md:min-h-0 md:h-7 px-2 rounded-lg flex items-center gap-1 text-muted-custom hover:text-[rgb(var(--accent-hover))] hover:bg-[rgb(var(--accent)_/_0.1)] transition-all text-[11px] font-medium"
              title={`${msg.views.length} ${msg.views.length === 1 ? 'view' : 'views'}`}
            >
              <Eye className="w-4 h-4" />
              <span>{msg.views.length}</span>
            </button>
          )}

          {currentUser?.isAdmin && (
            <>
              {confirmDelete ? (
                <button
                  onClick={() => {
                    onDelete(msg._id);
                    setConfirmDelete(false);
                  }}
                  className="min-h-[44px] md:min-h-0 md:h-7 px-3 rounded-lg flex items-center gap-1 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all text-[11px] font-medium"
                  title="Confirm delete"
                >
                  <Trash2 className="w-4 h-4" /> Confirm?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-muted-custom hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Community Page ───────────────────────────────────────────
export default function CommunityPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [viewingMessageDetails, setViewingMessageDetails] = useState<Message | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  // Track if user is near the bottom of the feed
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    isNearBottom.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Fetch current user on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setCurrentUser({
            rollNumber: data.rollNumber,
            name: data.name,
            isAdmin: data.isAdmin || data.isSuperAdmin,
          });
        }
      })
      .catch((err) => console.error('[Community Auth]', err));
  }, []);

  // Auto-resize the input textarea as the user types
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
      setHasOlder(data.hasOlder);
    } catch (err) {
      console.error('[Community Fetch]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + scroll to bottom
  useEffect(() => {
    fetchMessages().then(() => {
      // Give DOM a tick to render before scrolling
      setTimeout(() => scrollToBottom('instant'), 50);
    });
  }, [fetchMessages, scrollToBottom]);

  // Poll for new messages — swap this for Pusher/Ably when moving off serverless
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/messages');
        if (!res.ok) return;
        const data = await res.json();
        setMessages(data.messages);
        setHasOlder(data.hasOlder);

        // Auto-scroll only if user was already at the bottom
        if (isNearBottom.current) {
          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      } catch {
        // silently ignore poll failures
      }
    }, COMMUNITY_CONFIG.POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [scrollToBottom]);

  // Load older messages
  const loadOlder = async () => {
    if (!messages.length || loadingOlder) return;
    setLoadingOlder(true);

    try {
      const oldest = messages[0].createdAt;
      const res = await fetch(`/api/messages?before=${encodeURIComponent(oldest)}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages((prev) => [...data.messages, ...prev]);
      setHasOlder(data.hasOlder);
    } catch (err) {
      console.error('[Community LoadOlder]', err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // Send a message
  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          replyTo: replyTo || undefined,
        }),
      });

      if (res.ok) {
        setText('');
        setReplyTo(null);
        await fetchMessages();
        setTimeout(() => scrollToBottom('smooth'), 50);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          variant: 'error',
          title: 'Failed to send message',
          description: data.error || 'Please try again.',
        });
      }
    } catch (err) {
      console.error('[Community Send]', err);
      toast({
        variant: 'error',
        title: 'Failed to send message',
        description: 'Network error — please try again.',
      });
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Delete a message (admin only)
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== id));
      }
    } catch (err) {
      console.error('[Community Delete]', err);
    }
  };

  // Reply to a message
  const handleReply = (msg: Message) => {
    setReplyTo({
      messageId: msg._id,
      authorName: msg.authorName,
      snippet: msg.text.slice(0, 80) + (msg.text.length > 80 ? '…' : ''),
    });
    inputRef.current?.focus();
  };

  // Handle Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const SUGGESTED_PROMPTS = [
    'Anyone have DBMS PYQs?',
    'Tips for Sem 4 exams?',
    'Where can I find OS notes?',
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-screen min-h-0">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b border-custom"
      >
        <div className="max-w-2xl mx-auto w-full flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-page-h1">Community</h1>
            <p className="text-body">
              Share tips, ask questions, help each other out
            </p>
          </div>
        </div>
      </motion.div>

      {/* Feed */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 space-y-0.5"
      >
        <div className="max-w-2xl mx-auto w-full px-4">
        {/* Load older button */}
        {hasOlder && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-secondary hover:text-primary glass border border-custom hover:border-[rgb(var(--accent)_/_0.3)] transition-all disabled:opacity-50"
            >
              {loadingOlder ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
              Load older messages
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4 px-4 py-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-full skeleton flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-4 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-card-custom border border-custom flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-custom" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-1">No messages yet</h3>
            <p className="text-body max-w-xs">
              Be the first one to start a conversation. Say hi!
            </p>
          </motion.div>
        )}

        {/* Welcome prompts when feed is sparse */}
        {!loading && messages.length > 0 && messages.length < 3 && (
          <div className="mb-4">
            <div className="card p-4 border border-custom">
              <p className="text-body mb-3">Be the first to ask a question about this semester</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setText(prompt);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgb(var(--accent)_/_0.08)] border border-[rgb(var(--accent)_/_0.2)] text-[rgb(var(--accent-hover))] hover:bg-[rgb(var(--accent)_/_0.15)] transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              msg={msg}
              currentUser={currentUser}
              onReply={handleReply}
              onDelete={handleDelete}
              onShowViews={setViewingMessageDetails}
            />
          ))}
        </AnimatePresence>

        <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar — fixed at the bottom */}
      <div className="flex-shrink-0 px-3 sm:px-4 py-3 border-t border-custom bg-card-custom/50 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto w-full">
        {/* Reply preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between mb-2 px-3 py-2 rounded-lg bg-[rgb(var(--accent)_/_0.1)] border border-[rgb(var(--accent)_/_0.2)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Reply className="w-3.5 h-3.5 text-[rgb(var(--accent-hover))] flex-shrink-0" />
                <div className="truncate text-xs">
                  <span className="font-medium text-[rgb(var(--accent-hover))]">{replyTo.authorName}</span>
                  <span className="text-muted-custom ml-1.5">— {replyTo.snippet}</span>
                </div>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 rounded hover:bg-[rgb(var(--accent)_/_0.15)] text-secondary hover:text-primary transition-colors flex-shrink-0 ml-2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm bg-card-custom border border-custom focus:border-[rgb(var(--accent)_/_0.5)] focus:ring-1 focus:ring-[rgb(var(--accent)_/_0.2)] outline-none text-primary placeholder:text-muted-custom transition-all max-h-32 overflow-y-auto"
            style={{ minHeight: '44px' }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl gradient-accent text-white disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex-shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
        <p className="text-[10px] text-muted-custom mt-1.5 px-1">
          Press Enter to send · Shift+Enter for a new line
        </p>
        </div>
      </div>

      {/* Views Modal */}
      <AnimatePresence>
        {viewingMessageDetails && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-3xl glass-strong border border-custom bg-card-custom shadow-2xl p-6 overflow-hidden flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-custom flex-shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-primary">Message Viewers</h3>
                  <p className="text-xs text-muted-custom mt-0.5">
                    {viewingMessageDetails.views?.length || 0} {(viewingMessageDetails.views?.length || 0) === 1 ? 'person has' : 'people have'} seen this message
                  </p>
                </div>
                <button
                  onClick={() => setViewingMessageDetails(null)}
                  className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-custom border border-transparent hover:border-custom transition-all focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto py-4 flex-1 space-y-3 pr-1">
                {(!viewingMessageDetails.views || viewingMessageDetails.views.length === 0) ? (
                  <div className="text-center py-6 text-muted-custom text-sm">
                    No views recorded yet.
                  </div>
                ) : (
                  viewingMessageDetails.views.map((viewer, idx) => (
                    <div
                      key={viewer.rollNumber + '-' + idx}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-card-custom/40 border border-custom/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-primary">{viewer.name}</p>
                        <p className="text-xs font-mono text-muted-custom mt-0.5">{viewer.rollNumber}</p>
                      </div>
                      <span className="text-[10px] text-muted-custom">
                        {formatTime(viewer.viewedAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
