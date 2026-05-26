'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, CloudUpload, CheckCircle2, AlertCircle,
  FileText, FileImage, FileType2, X, Loader2
} from 'lucide-react';
import { SEM4_SUBJECTS } from '@/lib/subjects';

const BRANCHES = ['CSE', 'CSE-AIML', 'CSE-DS', 'IT'];
const TYPES = [
  { value: 'notes', label: 'Notes' },
  { value: 'qbank', label: 'Question Bank' },
  { value: 'pyq', label: 'PYQ' },
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'youtube', label: 'YouTube Link' },
];

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
}

function getFileIcon(type: string) {
  if (type.includes('pdf')) return FileText;
  if (type.includes('image')) return FileImage;
  if (type.includes('word') || type.includes('document')) return FileType2;
  return FileText;
}

function getFileType(mimeType: string): 'pdf' | 'image' | 'docx' | 'other' {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'docx';
  return 'other';
}

export default function ContributePage() {
  const [form, setForm] = useState({ branch: '', semester: '', subject: '', type: 'notes', youtubeUrl: '' });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  // Automatically fetch current student's branch and semester on load
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setForm((f) => ({
            ...f,
            branch: data.branch || 'CSE-AIML',
            semester: String(data.semester || '4'),
          }));
        }
      })
      .catch((err) => console.error('[Contribute Auth Fetch]', err));
  }, []);

  const getSubjectsList = (branch: string, semStr: string) => {
    const sem = Number(semStr);
    if (sem === 4 && branch && SEM4_SUBJECTS[branch]) {
      const data = SEM4_SUBJECTS[branch];
      return [...data.theory, ...(data.lab || [])];
    }
    // Fallback default subjects for other semesters
    return [
      { id: 'M1', label: 'Mathematics I', short: 'M1' },
      { id: 'EP', label: 'Engineering Physics', short: 'EP' },
      { id: 'EC', label: 'Engineering Chemistry', short: 'EC' },
      { id: 'PPS', label: 'Programming for Problem Solving', short: 'PPS' },
      { id: 'DS', label: 'Data Structures', short: 'DS' },
      { id: 'COA', label: 'Computer Organization & Architecture', short: 'COA' },
      { id: 'OS', label: 'Operating Systems', short: 'OS' },
      { id: 'DBMS', label: 'Database Management Systems', short: 'DBMS' },
    ];
  };

  const activeSubjects = getSubjectsList(form.branch, form.semester);

  // Clear subject if no longer valid when branch/sem updates
  useEffect(() => {
    const validLabels = activeSubjects.map((s) => s.label);
    if (form.subject && !validLabels.includes(form.subject)) {
      setForm((f) => ({ ...f, subject: '' }));
    }
  }, [form.branch, form.semester, activeSubjects]);

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...accepted.map((f) => ({ file: f, status: 'pending' as const, progress: 0 })),
    ]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const removeFile = (i: number) => setFiles((f) => f.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.branch || !form.semester || !form.subject) {
      setError('Please select a branch, semester, and subject');
      return;
    }
    if (form.type !== 'youtube' && files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (form.type === 'youtube') {
        // Save YouTube URL directly
        await fetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${form.subject} — YouTube Resource`,
            type: form.type,
            branch: form.branch,
            semester: Number(form.semester),
            subject: form.subject,
            url: form.youtubeUrl,
            fileType: 'youtube',
          }),
        });
      } else {
        // Upload each file via GCS signed URL
        for (let i = 0; i < files.length; i++) {
          const { file } = files[i];
          setFiles((f) =>
            f.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item)
          );

          // Get signed URL
          const signedRes = await fetch('/api/upload/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, contentType: file.type }),
          });

          if (!signedRes.ok) {
            const data = await signedRes.json();
            setError(data.error || 'Failed to initialize secure upload.');
            setFiles((f) =>
              f.map((item, idx) => idx === i ? { ...item, status: 'error', progress: 0 } : item)
            );
            return;
          }

          const { signedUrl } = await signedRes.json();

          // Upload to GCS
          await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          });

          // Save metadata
          await fetch('/api/resources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: file.name.replace(/\.[^.]+$/, ''),
              type: form.type,
              branch: form.branch,
              semester: Number(form.semester),
              subject: form.subject,
              url: signedUrl.split('?')[0], // public URL
              fileType: getFileType(file.type),
            }),
          });

          setFiles((f) =>
            f.map((item, idx) => idx === i ? { ...item, status: 'done', progress: 100 } : item)
          );
        }
      }

      setStatus('success');
      setFiles([]);
    } catch (err) {
      setStatus('error');
      setError('Upload failed — check your connection or GCS configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `
    w-full px-4 py-2.5 rounded-xl bg-card-custom border border-custom
    text-primary placeholder:text-muted-custom text-sm
    focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
    transition-all duration-150
  `;

  return (
    <div className="px-8 py-10 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-bold text-primary">Contribute Resources</h1>
        <p className="text-secondary mt-1">Upload & share study materials with your batch</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Metadata */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-primary">Resource Details</h2>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Branch</label>
              <div className={`${inputClass} bg-card-custom/50 cursor-not-allowed select-none flex items-center`}>
                {form.branch || 'Loading...'}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Semester</label>
              <div className={`${inputClass} bg-card-custom/50 cursor-not-allowed select-none flex items-center`}>
                Sem {form.semester || 'Loading...'}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Type *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={`${inputClass} cursor-pointer`}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Subject *</label>
            
            {/* Styled Dropdown */}
            <select
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Select a Subject...</option>
              {activeSubjects.map((sub) => (
                <option key={sub.id} value={sub.label}>
                  {sub.label} ({sub.short})
                </option>
              ))}
            </select>
          </div>

          {form.type === 'youtube' && (
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">YouTube URL *</label>
              <input
                type="url"
                value={form.youtubeUrl}
                onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* Drop zone */}
        {form.type !== 'youtube' && (
          <div className="card p-6">
            <h2 className="font-semibold text-primary mb-4">Upload Files</h2>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-custom hover:border-indigo-500/50 hover:bg-indigo-500/5'
                }
              `}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <CloudUpload className={`w-10 h-10 ${isDragActive ? 'text-indigo-400' : 'text-muted-custom'}`} />
                <div>
                  <p className="font-semibold text-primary">
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-secondary mt-0.5">or click to browse · PDF, Images, DOCX · Max 50MB</p>
                </div>
              </motion.div>
            </div>

            {/* File list */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 space-y-2"
                >
                  {files.map((f, i) => {
                    const Icon = getFileIcon(f.file.type);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card-custom border border-custom"
                      >
                        <Icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-primary truncate">{f.file.name}</div>
                          <div className="text-xs text-muted-custom">
                            {(f.file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        {f.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                        {f.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {f.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="p-1 rounded text-muted-custom hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Error / Success */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.div>
          )}
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Upload submitted! Pending admin approval.
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full py-3 rounded-xl gradient-accent text-white font-semibold flex items-center justify-center gap-2 glow-accent disabled:opacity-60 cursor-pointer"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {submitting ? 'Uploading...' : 'Submit Upload'}
        </motion.button>
      </motion.form>
    </div>
  );
}
