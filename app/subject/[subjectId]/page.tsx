'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, FileText, HelpCircle, Clock, BookOpen,
  Youtube, Library, ExternalLink, Eye, Loader2,
  FileImage, FileType2, Download, AlertCircle, Play,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

// ─── Tab config ───────────────────────────────────────────────────
const TABS = [
  { id: 'Notes',          label: 'Notes',          icon: FileText,    color: 'text-indigo-400'  },
  { id: 'Question Banks', label: 'Question Banks', icon: HelpCircle,  color: 'text-emerald-400' },
  { id: 'PYQs',           label: 'PYQs',           icon: Clock,       color: 'text-amber-400'   },
  { id: 'Syllabus',       label: 'Syllabus',       icon: BookOpen,    color: 'text-sky-400'     },
  { id: 'Textbooks',      label: 'Textbooks',      icon: Library,     color: 'text-purple-400'  },
  { id: 'YouTube',        label: 'YouTube',        icon: Youtube,     color: 'text-red-400'     },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Drive folder cache (branch→sem→subject→type = folderId) ──────
const folderCache: Map<string, string | null> = new Map();

async function findFolderId(
  parentId: string,
  name: string
): Promise<string | null> {
  const cacheKey = `${parentId}:${name}`;
  if (folderCache.has(cacheKey)) return folderCache.get(cacheKey)!;

  const res = await fetch(`/api/drive/list?folderId=${parentId}`);
  const { files } = await res.json();
  const match = (files as DriveFile[]).find(
    (f) => f.name.toLowerCase().trim() === name.toLowerCase().trim()
  );
  const found = match?.id ?? null;
  folderCache.set(cacheKey, found);
  return found;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf'))   return FileText;
  if (mimeType.includes('image')) return FileImage;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileType2;
  return FileText;
}

function formatSize(bytes?: string) {
  if (!bytes) return '';
  const n = Number(bytes);
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (n > 1024)        return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

// ─── Skeleton ─────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/3 rounded" />
      </div>
      <div className="skeleton h-8 w-20 rounded-xl" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function SubjectPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const searchParams  = useSearchParams();
  const branch   = searchParams.get('branch')   ?? 'CSE-AIML';
  const semester = searchParams.get('semester')  ?? '4';
  const label    = searchParams.get('label')     ?? decodeURIComponent(subjectId);

  const [activeTab, setActiveTab] = useState<TabId>('Notes');
  const [files,     setFiles]     = useState<DriveFile[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [ytLink,    setYtLink]    = useState('');

  // ── ONE request → server traverses entire Drive tree ──────────────
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    setFiles([]);
    setYtLink('');

    try {
      const params = new URLSearchParams({
        branch,
        semester,
        subject: decodeURIComponent(subjectId),
        tab:     activeTab,
      });
      const res  = await fetch(`/api/drive/files?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not load files');
        return;
      }

      if (data.ytLink) {
        setYtLink(data.ytLink);
      } else {
        setFiles(data.files ?? []);
      }
    } catch (err: any) {
      console.error(err);
      setError('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  }, [activeTab, branch, semester, subjectId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const proxyUrl = (fileId: string) => `/api/proxy/file?id=${fileId}`;

  return (
    <div className="px-8 py-10">
      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-xs text-muted-custom mb-6 flex-wrap"
      >
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/branch/${branch}`} className="hover:text-primary transition-colors">{branch}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/branch/${branch}/semester/${semester}`} className="hover:text-primary transition-colors">
          Sem {semester}
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary font-medium">{label}</span>
      </motion.div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl font-bold text-primary">{label}</h1>
        <p className="text-secondary text-sm mt-1">{branch} · Semester {semester}</p>
      </motion.div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 p-1 rounded-2xl glass-strong border border-custom mb-8 overflow-x-auto w-fit max-w-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap
              transition-all duration-150
              ${activeTab === tab.id ? 'text-white' : 'text-secondary hover:text-primary'}
            `}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-active-sub"
                className="absolute inset-0 gradient-accent rounded-xl"
                style={{ zIndex: -1 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              />
            )}
            <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-white' : tab.color}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* Error */}
          {error && !loading && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error} — Make sure the Drive folder structure is set up correctly.
            </div>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* ── YouTube Tab ── */}
          {!loading && activeTab === 'YouTube' && (
            ytLink ? (
              <div className="space-y-6">
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Youtube className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-primary">YouTube Playlist</span>
                  </div>
                  {/* Embed the playlist */}
                  <div className="aspect-video rounded-xl overflow-hidden bg-zinc-900">
                    <iframe
                      src={ytLink
                        .replace('playlist?list=', 'embed/videoseries?list=')
                        .replace('watch?v=', 'embed/')
                        .replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allowFullScreen
                      title={`${label} YouTube Playlist`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  </div>
                  <a
                    href={ytLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Open in YouTube
                  </a>
                </div>
              </div>
            ) : !error ? (
              <div className="card p-12 text-center">
                <Youtube className="w-10 h-10 text-muted-custom mx-auto mb-3" />
                <p className="text-secondary font-medium">No playlist added yet</p>
                <p className="text-xs text-muted-custom mt-1">
                  Add a <code className="bg-card-custom px-1 rounded">YouTube/playlist.txt</code> file in Drive for this subject.
                </p>
              </div>
            ) : null
          )}

          {/* ── File list (all other tabs) ── */}
          {!loading && activeTab !== 'YouTube' && !error && (
            files.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="w-10 h-10 text-muted-custom mx-auto mb-3" />
                <p className="text-secondary font-medium">No {activeTab} uploaded yet</p>
                <p className="text-xs text-muted-custom mt-1">
                  Add files to the <code className="bg-card-custom px-1 rounded">{activeTab}/</code> folder in Drive.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file, i) => {
                  const Icon    = getFileIcon(file.mimeType);
                  const isPDF   = file.mimeType.includes('pdf');
                  const isImage = file.mimeType.includes('image');
                  const isDocx  = file.mimeType.includes('word') || file.mimeType.includes('document');
                  const fileLabel = isPDF ? 'PDF' : isImage ? 'Image' : isDocx ? 'DOCX' : 'File';
                  const labelColor = isPDF ? 'text-indigo-400' : isImage ? 'text-sky-400' : isDocx ? 'text-emerald-400' : 'text-zinc-400';
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="card-hover p-4 flex items-center gap-4 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-card-custom border border-custom flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-primary truncate">{file.name}</div>
                        <div className="text-xs text-muted-custom mt-0.5 flex items-center gap-2">
                          <span className={`uppercase font-mono font-semibold ${labelColor}`}>{fileLabel}</span>
                          {file.size && <span>{formatSize(file.size)}</span>}
                          {file.modifiedTime && (
                            <span>{new Date(file.modifiedTime).toLocaleDateString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Preview — opens in a new browser tab */}
                        <a
                          href={proxyUrl(file.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium glass border border-custom text-secondary hover:text-primary transition-all flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </a>
                        {/* Download — forces save-as */}
                        <a
                          href={proxyUrl(file.id)}
                          download={file.name}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium gradient-accent text-white flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* No modal — preview opens in a new browser tab */}
    </div>
  );
}
