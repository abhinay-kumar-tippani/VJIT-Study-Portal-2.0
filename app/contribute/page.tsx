'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, CloudUpload, CheckCircle2, AlertCircle,
  FileText, FileImage, FileType2, X, Loader2, PlusCircle
} from 'lucide-react';
import { getBranchSubjects } from '@/lib/subjects';
import { toast } from '@/components/ui/toaster';

const BRANCH_OPTIONS = [
  { value: 'CSE-AIML', label: 'CSE — AI & Machine Learning' },
  { value: 'CSE',      label: 'Computer Science Engineering (CSE)' },
  { value: 'CSE-DS',   label: 'CSE — Data Science' },
  { value: 'IT',       label: 'Information Technology (IT)' },
  { value: 'ECE',      label: 'Electronics & Communication (ECE)' },
  { value: 'EEE',      label: 'Electrical & Electronics (EEE)' },
  { value: 'CIVIL',    label: 'Civil Engineering' },
  { value: 'MECH',     label: 'Mechanical Engineering' },
  { value: 'OTHER',    label: '+ Other / Custom Branch...' },
];

const SEMESTER_OPTIONS = [
  { value: '1', label: '1st Semester' },
  { value: '2', label: '2nd Semester' },
  { value: '3', label: '3rd Semester' },
  { value: '4', label: '4th Semester' },
  { value: '5', label: '5th Semester' },
  { value: '6', label: '6th Semester' },
  { value: '7', label: '7th Semester' },
  { value: '8', label: '8th Semester' },
];

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

// Fallback general subject list for semesters/branches without explicit static configs
const GENERAL_SUBJECTS = [
  { id: 'M1', label: 'Mathematics I', short: 'M1' },
  { id: 'M2', label: 'Mathematics II', short: 'M2' },
  { id: 'M3', label: 'Mathematics III', short: 'M3' },
  { id: 'EP', label: 'Engineering Physics', short: 'EP' },
  { id: 'EC', label: 'Engineering Chemistry', short: 'EC' },
  { id: 'PPS', label: 'Programming for Problem Solving (C)', short: 'PPS' },
  { id: 'DS', label: 'Data Structures', short: 'DS' },
  { id: 'COA', label: 'Computer Organization & Architecture', short: 'COA' },
  { id: 'DLD', label: 'Digital Logic Design', short: 'DLD' },
  { id: 'OS', label: 'Operating Systems', short: 'OS' },
  { id: 'DBMS', label: 'Database Management Systems', short: 'DBMS' },
  { id: 'CN', label: 'Computer Networks', short: 'CN' },
  { id: 'DAA', label: 'Design & Analysis of Algorithms', short: 'DAA' },
  { id: 'AI', label: 'Artificial Intelligence', short: 'AI' },
  { id: 'ML', label: 'Machine Learning', short: 'ML' },
  { id: 'JAVA', label: 'OOPs through Java', short: 'Java' },
  { id: 'PYTHON', label: 'Python Programming', short: 'Python' },
  { id: 'SE', label: 'Software Engineering', short: 'SE' },
  { id: 'FLAT', label: 'Formal Languages & Automata Theory', short: 'FLAT' },
  { id: 'CD', label: 'Compiler Design', short: 'CD' },
  { id: 'WT', label: 'Web Technologies', short: 'WT' },
  { id: 'CNS', label: 'Cryptography & Network Security', short: 'CNS' },
  { id: 'CC', label: 'Cloud Computing', short: 'CC' },
];

export default function ContributePage() {
  const [form, setForm] = useState({
    branch: 'CSE-AIML',
    customBranch: '',
    semester: '5',
    subject: '',
    customSubject: '',
    type: 'notes',
    youtubeUrl: '',
  });

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
            semester: String(data.semester || '5'),
          }));
        }
      })
      .catch((err) => console.error('[Contribute Auth Fetch]', err));
  }, []);

  const getSubjectsList = (branch: string, semStr: string) => {
    const sem = Number(semStr);
    const data = getBranchSubjects(branch, sem);
    const staticList = data ? [...data.theory, ...(data.lab || [])] : GENERAL_SUBJECTS;
    
    // Always append Custom option
    return [
      ...staticList,
      { id: '__CUSTOM__', label: '+ Other / Custom Subject...', short: 'Custom' },
    ];
  };

  const activeSubjects = getSubjectsList(form.branch, form.semester);

  // Clear subject selection if branch/sem changes and subject is no longer in option list
  useEffect(() => {
    const validIds = activeSubjects.map((s) => s.id);
    if (form.subject && form.subject !== '__CUSTOM__' && !validIds.includes(form.subject)) {
      setForm((f) => ({ ...f, subject: '', customSubject: '' }));
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
    
    const finalBranch = form.branch === 'OTHER' ? form.customBranch.trim() : form.branch;
    const finalSubject = form.subject === '__CUSTOM__' ? form.customSubject.trim() : form.subject;

    if (!finalBranch) {
      setError('Please select or specify a branch');
      return;
    }
    if (!form.semester) {
      setError('Please select a semester');
      return;
    }
    if (!finalSubject) {
      setError('Please select or specify a subject');
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
        const selectedSubject = activeSubjects.find((s) => s.id === finalSubject);
        const subjectLabel = selectedSubject ? selectedSubject.label : finalSubject;

        await fetch('/api/resources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${subjectLabel} — YouTube Resource`,
            type: form.type,
            branch: finalBranch,
            semester: Number(form.semester),
            subject: finalSubject,
            url: form.youtubeUrl,
            fileType: 'youtube',
          }),
        });
      } else {
        // Upload each file to storage and create resource record
        for (let i = 0; i < files.length; i++) {
          const { file } = files[i];
          setFiles((f) =>
            f.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item)
          );

          const uploadData = new FormData();
          uploadData.append('file', file);

          const uploadRes = await fetch('/api/upload/gcs', {
            method: 'POST',
            body: uploadData,
          });

          if (!uploadRes.ok) {
            const data = await uploadRes.json();
            setError(data.error || 'Failed to upload file to storage.');
            toast({
              variant: 'error',
              title: 'Upload failed',
              description: data.error || 'Failed to upload file.',
            });
            setFiles((f) =>
              f.map((item, idx) => idx === i ? { ...item, status: 'error', progress: 0 } : item)
            );
            return;
          }

          const { viewUrl } = await uploadRes.json();

          await fetch('/api/resources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: file.name.replace(/\.[^.]+$/, ''),
              type: form.type,
              branch: finalBranch,
              semester: Number(form.semester),
              subject: finalSubject,
              url: viewUrl,
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
      toast({
        variant: 'success',
        title: 'Upload submitted!',
        description: 'Pending admin approval.',
      });
    } catch {
      setStatus('error');
      setError('Upload failed — check your connection or storage configuration');
      toast({
        variant: 'error',
        title: 'Upload failed',
        description: 'Check your connection or storage configuration.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `
    w-full px-4 py-2.5 rounded-xl bg-card-custom border border-custom
    text-primary placeholder:text-muted-custom text-sm
    focus:outline-none focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent)_/_0.2)]
    transition-all duration-150
  `;

  return (
    <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-10 max-w-3xl mx-auto w-full">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-page-h1">Contribute Resources</h1>
        <p className="text-secondary mt-1">Upload & share study materials for any branch, semester, or subject</p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Metadata */}
        <div className="card p-4 sm:p-6 space-y-5">
          <h2 className="font-semibold text-primary">Resource Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3">
            {/* Branch Selector */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Branch *</label>
              <select
                value={form.branch}
                onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                className={`${inputClass} cursor-pointer`}
              >
                {BRANCH_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            {/* Semester Selector */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Semester *</label>
              <select
                value={form.semester}
                onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
                className={`${inputClass} cursor-pointer`}
              >
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Resource Type */}
            <div>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Type *</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={`${inputClass} cursor-pointer`}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Custom Branch Input (if OTHER chosen) */}
          {form.branch === 'OTHER' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Branch Name *</label>
              <input
                type="text"
                value={form.customBranch}
                onChange={(e) => setForm((f) => ({ ...f, customBranch: e.target.value }))}
                placeholder="e.g. AI & Data Science, Chemical Eng..."
                required
                className={inputClass}
              />
            </motion.div>
          )}

          {/* Subject Dropdown */}
          <div>
            <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">Subject *</label>
            <select
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              required
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">Select a Subject...</option>
              {activeSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.label} {sub.short ? `(${sub.short})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Subject Input (if __CUSTOM__ chosen) */}
          {form.subject === '__CUSTOM__' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5 text-[rgb(var(--accent-hover))]" />
                <span>Custom Subject Name *</span>
              </label>
              <input
                type="text"
                value={form.customSubject}
                onChange={(e) => setForm((f) => ({ ...f, customSubject: e.target.value }))}
                placeholder="e.g. Control Systems, VLSI Design, Fluid Mechanics..."
                required
                className={inputClass}
              />
            </motion.div>
          )}

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
          <div className="card p-4 sm:p-6">
            <h2 className="font-semibold text-primary mb-4">Upload Files</h2>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center cursor-pointer
                transition-all duration-200
                ${isDragActive
                  ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent)_/_0.1)]'
                  : 'border-custom hover:border-[rgb(var(--accent)_/_0.5)] hover:bg-[rgb(var(--accent)_/_0.05)]'
                }
              `}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                className="flex flex-col items-center gap-3"
              >
                <CloudUpload className={`w-10 h-10 ${isDragActive ? 'text-[rgb(var(--accent-hover))]' : 'text-muted-custom'}`} />
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
                        <Icon className="w-4 h-4 text-[rgb(var(--accent-hover))] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-primary truncate">{f.file.name}</div>
                          <div className="text-xs text-muted-custom">
                            {(f.file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        {f.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-[rgb(var(--accent-hover))]" />}
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
          className="w-full py-3 rounded-xl gradient-accent text-white font-semibold flex items-center justify-center gap-2 glow-accent disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {submitting ? 'Uploading...' : 'Submit Upload'}
        </motion.button>
      </motion.form>
    </div>
  );
}
