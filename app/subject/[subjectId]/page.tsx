'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, FileText, HelpCircle, Clock, BookOpen,
  Youtube, Library, ExternalLink, Eye, Loader2,
  FileImage, FileType2, Download, AlertCircle, Play, X
} from 'lucide-react';

import { SEM4_SUBJECTS } from '@/lib/subjects';


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

// Map tab label to database resource type
const tabToTypeMap: Record<string, string> = {
  'Notes': 'notes',
  'Question Banks': 'qbank',
  'PYQs': 'pyq',
  'Syllabus': 'syllabus',
  'YouTube': 'youtube',
};

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

function getFileIconForContributed(fileType: string) {
  if (fileType === 'pdf') return FileText;
  if (fileType === 'image') return FileImage;
  if (fileType === 'docx') return FileType2;
  if (fileType === 'youtube') return Youtube;
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

// ─── Playlist Card Component with oEmbed ──────────────────────────
interface PlaylistCardProps {
  title: string;
  url: string;
}

function PlaylistCard({ title, url }: PlaylistCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) {
          if (data && data.thumbnail_url) {
            setThumbnailUrl(data.thumbnail_url);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('[oEmbed fetch error]', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="card p-4 flex flex-col gap-3 h-full animate-pulse bg-zinc-900/20 border border-zinc-800">
        <div className="skeleton aspect-video w-full rounded-xl animate-pulse bg-zinc-800" style={{ minHeight: '120px' }} />
        <div className="skeleton h-4 w-3/4 rounded mt-2 animate-pulse bg-zinc-800" />
        <div className="skeleton h-8 w-full rounded-xl mt-2 animate-pulse bg-zinc-800" />
      </div>
    );
  }

  if (!thumbnailUrl) {
    // Fallback card
    return (
      <motion.div
        whileHover={{ y: -3, scale: 1.01 }}
        className="card-hover p-6 flex flex-col items-center justify-between border border-custom bg-card-custom h-full text-center group"
      >
        <div className="flex flex-col items-center gap-4 flex-1 justify-center py-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/25 group-hover:scale-110 transition-transform duration-300">
            <Youtube className="w-8 h-8 text-red-500 fill-current" />
          </div>
          <div>
            <h4 className="font-bold text-primary text-sm line-clamp-2 px-2 group-hover:text-indigo-400 transition-colors">
              {title}
            </h4>
            <p className="text-[11px] text-muted-custom mt-1">Playlist Resource</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full px-4 py-2 rounded-xl text-xs font-semibold gradient-accent text-white flex items-center justify-center gap-1.5 glow-accent"
        >
          <Play className="w-3 h-3 fill-current" /> Watch Playlist
        </a>
      </motion.div>
    );
  }

  // Premium playlist card with thumbnail
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      className="card-hover overflow-hidden flex flex-col justify-between border border-custom bg-card-custom h-full group"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
        <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
          <Youtube className="w-3 h-3 text-red-500 fill-current" /> Playlist
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <h4 className="font-bold text-primary text-sm line-clamp-2 mb-4 group-hover:text-indigo-400 transition-colors leading-snug">
          {title}
        </h4>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-2 rounded-xl text-xs font-semibold gradient-accent text-white flex items-center justify-center gap-1.5 glow-accent"
        >
          <Play className="w-3 h-3 fill-current" /> Watch Playlist
        </a>
      </div>
    </motion.div>
  );
}

// ─── Page Content ──────────────────────────────────────────────────
function SubjectPageContent() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const searchParams  = useSearchParams();
  const branch   = searchParams.get('branch')   ?? 'CSE-AIML';
  const semester = searchParams.get('semester')  ?? '4';
  const label    = searchParams.get('label')     ?? decodeURIComponent(subjectId);

  const branchConfig = SEM4_SUBJECTS[branch];
  const subjectConfig = branchConfig
    ? [...(branchConfig.theory || []), ...(branchConfig.lab || [])].find(
        (s) => s.id === decodeURIComponent(subjectId)
      )
    : null;

  const [activeTab, setActiveTab] = useState<TabId>('Notes');
  const [files,     setFiles]     = useState<DriveFile[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [ytLink,    setYtLink]    = useState('');

  // Contributed resources
  const [contributedResources, setContributedResources] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ rollNumber: string } | null>(null);
  const [approvalNotification, setApprovalNotification] = useState<string | null>(null);

  // Fetch current user details on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setCurrentUser(data);
      })
      .catch((err) => console.error('[Subject Auth Fetch]', err));
  }, []);

  // ── ONE request → server traverses entire Drive tree ──────────────
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError('');
    setFiles([]);
    setYtLink('');
    setContributedResources([]);

    try {
      // 1. Fetch Google Drive files
      const params = new URLSearchParams({
        branch,
        semester,
        subject: decodeURIComponent(subjectId),
        tab:     activeTab,
      });
      const res  = await fetch(`/api/drive/files?${params}`);
      const data = await res.json();

      if (res.ok) {
        if (data.ytLink) {
          setYtLink(data.ytLink);
        } else {
          setFiles(data.files ?? []);
        }
      } else {
        // We log Drive errors but don't hard block, as database files can still be loaded
        console.warn('Drive fetching warning:', data.error);
        setError(data.error ?? 'Drive resources not fully loaded');
      }

      // 2. Fetch database contributed resources
      const type = tabToTypeMap[activeTab];
      if (type) {
        const dbRes = await fetch(
          `/api/resources?branch=${branch}&semester=${semester}&subject=${encodeURIComponent(
            decodeURIComponent(subjectId)
          )}&type=${type}`
        );
        if (dbRes.ok) {
          const dbData = await dbRes.json();
          setContributedResources(dbData.resources ?? []);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Network error — check your connection');
    } finally {
      setLoading(false);
    }
  }, [activeTab, branch, semester, subjectId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  // Handle Dynamic approval notification banners
  useEffect(() => {
    if (!currentUser || contributedResources.length === 0) return;

    // Find all approved contributions by the current user
    const userApproved = contributedResources.filter(
      (r) => r.uploadedBy === currentUser.rollNumber && r.status === 'approved'
    );

    if (userApproved.length > 0) {
      const seenApproved = JSON.parse(localStorage.getItem('seen_approved_resources') || '[]');
      const unseen = userApproved.filter((r) => !seenApproved.includes(r._id));

      if (unseen.length > 0) {
        // Show notification banner for first unseen item
        setApprovalNotification(`🎉 Your contribution "${unseen[0].title}" has been approved by the admin!`);
        
        // Save resource IDs as seen
        const nextSeen = [...seenApproved, ...unseen.map((r) => r._id)];
        localStorage.setItem('seen_approved_resources', JSON.stringify(nextSeen));
      }
    }
  }, [currentUser, contributedResources]);

  const previewUrl = (fileId: string) => `/api/proxy/file/preview?id=${fileId}`;
  const downloadUrl = (fileId: string) => `/api/proxy/file?id=${fileId}`;

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

      {/* Dynamic Approval Notification Banner */}
      {approvalNotification && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm mb-6"
        >
          <div className="flex items-center gap-2">
            <span role="img" aria-label="celebrate">🎉</span>
            <span>{approvalNotification}</span>
          </div>
          <button
            onClick={() => setApprovalNotification(null)}
            className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

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
          {error && !loading && files.length === 0 && contributedResources.length === 0 && (
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
            <div className="space-y-6">
              {/* Curated Playlists from config */}
              {subjectConfig?.youtube && subjectConfig.youtube.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-400" />
                    Curated Playlists
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {subjectConfig.youtube.map((pl, i) => (
                      <PlaylistCard key={i} title={pl.title} url={pl.url} />
                    ))}
                  </div>
                </div>
              )}

              {/* Drive YouTube Playlist (if it exists) */}
              {ytLink ? (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Youtube className="w-5 h-5 text-red-400" />
                    <span className="font-semibold text-primary">
                      {subjectConfig?.youtube && subjectConfig.youtube.length > 0
                        ? "Additional Reference Playlist"
                        : "YouTube Playlist"
                      }
                    </span>
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
              ) : null}

              {/* Empty placeholder */}
              {!ytLink && (!subjectConfig?.youtube || subjectConfig.youtube.length === 0) && (!error && contributedResources.length === 0) ? (
                <div className="card p-12 text-center">
                  <Youtube className="w-10 h-10 text-muted-custom mx-auto mb-3" />
                  <p className="text-secondary font-medium">No playlist added yet</p>
                  <p className="text-xs text-muted-custom mt-1">
                    Add a <code className="bg-card-custom px-1 rounded">YouTube/playlist.txt</code> file in Drive for this subject.
                  </p>
                </div>
              ) : null}

              {/* Student Contributed YouTube Videos */}
              {contributedResources.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-rose-400" />
                    Student Contributed Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contributedResources.map((res) => {
                      const isPending = res.status === 'pending';
                      const isRejected = res.status === 'rejected';

                      return (
                        <div
                          key={res._id}
                          className="card p-5 flex flex-col justify-between border border-custom bg-card-custom hover:border-indigo-500/20 transition-all duration-200"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2.5">
                              <span className="text-xs text-muted-custom">
                                Submitted by {res.uploadedBy}
                              </span>
                              {isPending && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                                  ⏳ Pending Approval
                                </span>
                              )}
                              {isRejected && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                                  ❌ Rejected
                                </span>
                              )}
                              {!isPending && !isRejected && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                  Approved Contribution
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-primary text-sm line-clamp-2 mb-2">{res.title}</h4>
                            {isRejected && res.rejectionReason && (
                              <p className="text-xs text-rose-400 mt-1 font-medium">Rejection Reason: {res.rejectionReason}</p>
                            )}
                          </div>
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 w-full px-3 py-2 rounded-xl text-xs font-semibold gradient-accent text-white flex items-center justify-center gap-1.5 glow-accent"
                          >
                            <Play className="w-3 h-3 fill-current" /> Watch / Access Link
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── File list (all other tabs) ── */}
          {!loading && activeTab !== 'YouTube' && (
            (files.length === 0 && contributedResources.length === 0) ? (
              <div className="card p-12 text-center">
                <FileText className="w-10 h-10 text-muted-custom mx-auto mb-3" />
                <p className="text-secondary font-medium">No {activeTab} uploaded yet</p>
                <p className="text-xs text-muted-custom mt-1">
                  Add files to the <code className="bg-card-custom px-1 rounded">{activeTab}/</code> folder in Drive or contribute one!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 1. Drive Files List */}
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
                      className="card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-4 group"
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                        <div className="w-10 h-10 rounded-xl bg-card-custom border border-custom flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-primary truncate">{file.name}</div>
                          <div className="text-xs text-muted-custom mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className={`uppercase font-mono font-semibold ${labelColor}`}>{fileLabel}</span>
                            {file.size && <span>{formatSize(file.size)}</span>}
                            {file.modifiedTime && (
                              <span>{new Date(file.modifiedTime).toLocaleDateString('en-IN')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 sm:w-auto w-full">
                        {/* Preview — opens in a new browser tab */}
                        <a
                          href={previewUrl(file.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium gradient-accent text-white flex items-center justify-center gap-1.5"
                          // className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium glass border border-custom text-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> View 
                        </a>
                        <div style={{  gap: '25px' }}></div>
                        {/* Download — forces save-as */}
                        <a
                          href={downloadUrl(file.id)}
                          download={file.name}
                          className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium gradient-accent text-white flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                      </div>
                    </motion.div>
                  );
                })}

                {/* 2. Contributed Resources List */}
                {contributedResources.map((res, i) => {
                  const Icon = getFileIconForContributed(res.fileType);
                  const isPending = res.status === 'pending';
                  const isRejected = res.status === 'rejected';

                  return (
                    <motion.div
                      key={res._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: (files.length + i) * 0.04 }}
                      className="card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-4 group"
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                        <div className="w-10 h-10 rounded-xl bg-card-custom border border-custom flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-primary truncate flex items-center gap-2 flex-wrap">
                            <span>{res.title}</span>
                            {isPending && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                                ⏳ Waiting for Admin Approval
                              </span>
                            )}
                            {isRejected && (
                              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                                ❌ Rejected
                              </span>
                            )}
                            {!isPending && !isRejected && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                                Community
                              </span>
                            )}
                          </div>
                          {isRejected && res.rejectionReason && (
                            <p className="text-xs text-rose-400 mt-1 font-medium">Rejection Reason: {res.rejectionReason}</p>
                          )}
                          <div className="text-xs text-muted-custom mt-0.5 flex items-center gap-2 flex-wrap">
                            <span className="uppercase font-mono font-semibold text-emerald-400">{res.fileType}</span>
                            <span>Contributed by {res.uploadedBy}</span>
                            {res.createdAt && (
                              <span>{new Date(res.createdAt).toLocaleDateString('en-IN')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 sm:w-auto w-full">
                        {/* Preview/Download Button */}
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-medium gradient-accent text-white flex items-center justify-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Preview / Download
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

export default function SubjectPage() {
  return (
    <Suspense fallback={
      <div className="px-8 py-10 space-y-8 animate-pulse">
        <div className="space-y-3">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-8 w-64 rounded-xl" />
        </div>
        <div className="skeleton h-12 w-96 rounded-2xl" />
        <div className="space-y-3">
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl" />
          <div className="skeleton h-14 rounded-xl" />
        </div>
      </div>
    }>
      <SubjectPageContent />
    </Suspense>
  );
}
