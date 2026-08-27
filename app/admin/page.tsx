// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
 interface IssueReport {
   [key: string]: any;
 }
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, Search, Eye, EyeOff,
  Trash2, Crown, AlertCircle, Loader2, RefreshCw,
  User, BookOpen, Calendar, GraduationCap, ExternalLink,
  X, CheckCircle2, ArrowUpDown, Pencil, KeyRound
} from 'lucide-react';
import type { AdminUserRow } from '@/types';
import { getBranchFromRollNumber, getBranchLabel } from '@/lib/branch';

// Lucide icon helper
import { FileText, FileImage, FileType2, Youtube } from 'lucide-react';

function getFileIcon(type: string) {
  if (!type) return FileText;
  const t = type.toLowerCase();
  if (t.includes('pdf')) return FileText;
  if (t.includes('image') || t.includes('png') || t.includes('jpg') || t.includes('jpeg')) return FileImage;
  if (t.includes('word') || t.includes('document') || t === 'docx') return FileType2;
  if (t === 'youtube') return Youtube;
  return FileText;
}

// Toggle feature: set to true to show student branch instead of password, set to false to rollback
const SHOW_BRANCH_INSTEAD_OF_PASSWORD = true;

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'pending' | 'issues' | 'activity'>('users');
  const [branchSortDir, setBranchSortDir] = useState<'asc' | 'desc' | null>(null);
  
  // Users state
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Edit Password state
  const [editPasswordUser, setEditPasswordUser] = useState<{ userId: string; rollNumber: string; name: string; currentPass: string } | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSavePassword = async () => {
    if (!editPasswordUser || !newPasswordInput.trim()) return;
    if (newPasswordInput.trim().length < 6) {
      toast({ variant: 'error', title: 'Password must be at least 6 characters' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editPasswordUser.userId,
          newPassword: newPasswordInput.trim(),
        }),
      });
      if (res.ok) {
        toast({ variant: 'success', title: 'Password updated!', description: `Updated password for ${editPasswordUser.rollNumber}` });
        setEditPasswordUser(null);
        setNewPasswordInput('');
        fetchUsers();
      } else {
        const data = await res.json();
        toast({ variant: 'error', title: 'Failed to update password', description: data.error });
      }
    } catch {
      toast({ variant: 'error', title: 'Network error updating password' });
    } finally {
      setSavingPassword(false);
    }
  };

  // Active users state
  const [activeUsersCount, setActiveUsersCount] = useState<number | null>(null);
  const [activeUsersList, setActiveUsersList] = useState<any[]>([]);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);

  // Pending materials state
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState('');
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Issues state
  const [issuesList, setIssuesList] = useState<any[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<IssueReport | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Daily activity state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDate = (dateStr: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateStr]: !prev[dateStr],
    }));
  };

  const fetchActiveUsers = async () => {
    setActiveUsersLoading(true);
    try {
      const res = await fetch('/api/admin/active-users');
      if (res.ok) {
        const data = await res.json();
        setActiveUsersCount(data.activeCount);
        setActiveUsersList(data.activeUsers ?? []);
      }
    } catch (err) {
      console.error('Failed to fetch active users count', err);
    } finally {
      setActiveUsersLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    setActivityLoading(true);
    setActivityError('');
    try {
      const res = await fetch('/api/admin/activity-logs');
      if (!res.ok) {
        setActivityError('Failed to load daily activity logs');
        return;
      }
      const data = await res.json();
      setActivityLogs(data.logs ?? []);
    } catch {
      setActivityError('Network error');
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    fetchActiveUsers();
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        setError('Failed to load users');
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      if (data.users?.[0]?.plainPassword !== undefined) setIsSuperAdmin(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    setPendingLoading(true);
    setPendingError('');
    try {
      const res = await fetch('/api/admin/pending');
      if (!res.ok) {
        setPendingError('Failed to load pending submissions');
        return;
      }
      const data = await res.json();
      setPendingList(data.resources ?? []);
    } catch {
      setPendingError('Network error');
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchIssues = async () => {
    setIssuesLoading(true);
    setIssuesError('');
    try {
      const res = await fetch('/api/issues');
      if (!res.ok) {
        setIssuesError('Failed to load reported issues');
        return;
      }
      const data = await res.json();
      setIssuesList(data.issues ?? []);
    } catch {
      setIssuesError('Network error');
    } finally {
      setIssuesLoading(false);
    }
  };

  const handleResolveIssue = async (reportId: string) => {
    try {
      const res = await fetch(`/api/issues/${reportId}/resolve`, {
        method: 'POST',
      });
      if (res.ok) {
        setIssuesList((prev) =>
          prev.map((iss) =>
            iss.reportId === reportId
              ? { ...iss, status: 'resolved', resolvedAt: new Date().toISOString() }
              : iss
          )
        );
        setSelectedIssue((prev: IssueReport | null) =>
          prev && prev.reportId === reportId
            ? { ...prev, status: 'resolved', resolvedAt: new Date().toISOString() }
            : prev
        );
      } else {
        alert('Failed to resolve issue');
      }
    } catch {
      alert('Network error');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPending();
    fetchIssues();
    fetchActiveUsers();
    fetchActivityLogs();

    // Poll active user count every 30 seconds
    const interval = setInterval(fetchActiveUsers, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, isAdmin }),
    });
    fetchUsers();
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    fetchUsers();
  };

  const handleApprove = async (resourceId: string) => {
    try {
      const res = await fetch('/api/admin/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, action: 'approve' }),
      });
      if (res.ok) {
        setPendingList((prev) => prev.filter((item) => item._id !== resourceId));
      } else {
        alert('Failed to approve resource');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleReject = async (resourceId: string, reason: string) => {
    try {
      const res = await fetch('/api/admin/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, action: 'reject', rejectionReason: reason }),
      });
      if (res.ok) {
        setPendingList((prev) => prev.filter((item) => item._id !== resourceId));
        setRejectingId(null);
      } else {
        alert('Failed to reject resource');
      }
    } catch {
      alert('Network error');
    }
  };

  let filteredUsers = users.filter(
    (u) =>
      u.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

  if (SHOW_BRANCH_INSTEAD_OF_PASSWORD && branchSortDir) {
    filteredUsers = [...filteredUsers].sort((a, b) => {
      const branchA = getBranchFromRollNumber(a.rollNumber);
      const branchB = getBranchFromRollNumber(b.rollNumber);
      if (branchSortDir === 'asc') {
        return branchA.localeCompare(branchB);
      } else {
        return branchB.localeCompare(branchA);
      }
    });
  }

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl gradient-accent flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {isSuperAdmin && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[rgb(var(--accent)_/_0.15)] text-[rgb(var(--accent-hover))] text-[10px] font-bold">
                  <Crown className="w-2.5 h-2.5" /> SUPER ADMIN
                </span>
              )}
              <span className="text-xs text-secondary">
                {activeTab === 'users'
                  ? `${users.length} registered student${users.length !== 1 ? 's' : ''}`
                  : activeTab === 'pending'
                  ? `${pendingList.length} pending material${pendingList.length !== 1 ? 's' : ''}`
                  : activeTab === 'issues'
                  ? `${issuesList.length} reported issue${issuesList.length !== 1 ? 's' : ''}`
                  : `${activityLogs.reduce((acc, log) => acc + log.count, 0)} student visit${activityLogs.reduce((acc, log) => acc + log.count, 0) !== 1 ? 's' : ''} recorded`}
              </span>
              {activeUsersCount !== null && (
                <span 
                  onClick={() => {
                    fetchActiveUsers();
                    setShowActiveUsersModal(true);
                  }}
                  title="Click to view active users"
                  className="cursor-pointer flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-all select-none"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  {activeUsersCount} ACTIVE NOW
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 rounded-2xl glass border border-custom mb-6 overflow-x-auto w-fit max-w-full">
        {([
          { id: 'users' as const, label: 'Registered Students', icon: Users, badge: null },
          { id: 'pending' as const, label: 'Pending Approvals', icon: ShieldCheck, badge: pendingList.length },
          { id: 'issues' as const, label: 'Issues', icon: AlertCircle, badge: issuesList.filter((i) => i.status === 'pending').length },
          { id: 'activity' as const, label: 'Daily Activity', icon: Calendar, badge: null },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap
              transition-all duration-150
              ${activeTab === tab.id
                ? 'bg-[rgb(var(--accent)_/_0.15)] text-primary'
                : 'text-secondary hover:text-primary hover:bg-card-custom/50'}
            `}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div
            key="users-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-custom" />
                <input
                  type="text"
                  placeholder="Search by name or roll no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="
                    w-full pl-9 pr-4 py-2.5 rounded-xl bg-card-custom border border-custom
                    text-primary placeholder:text-muted-custom text-sm
                    focus:outline-none focus:border-[rgb(var(--accent))] transition-all
                  "
                />
              </div>
              <button
                onClick={fetchUsers}
                className="p-2.5 rounded-xl glass border border-custom text-secondary hover:text-primary transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="flex items-center gap-2 text-xs text-muted-custom">
                <Users className="w-3.5 h-3.5" />
                {filteredUsers.length} of {users.length}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {/* Table */}
            <div className="card overflow-hidden">
              {loading ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--accent-hover))] mx-auto mb-3" />
                  <p className="text-secondary text-sm">Loading users...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-custom bg-card-custom">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">#</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Roll No.</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Name</th>
                        {isSuperAdmin && (
                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[rgb(var(--accent-hover))]">
                            {SHOW_BRANCH_INSTEAD_OF_PASSWORD ? (
                              <button
                                onClick={() => {
                                  setBranchSortDir((prev) => {
                                    if (prev === null) return 'asc';
                                    if (prev === 'asc') return 'desc';
                                    return null;
                                  });
                                }}
                                className="flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
                              >
                                <GraduationCap className="w-3.5 h-3.5" /> Branch
                                <ArrowUpDown className={`w-3.5 h-3.5 transition-transform ${branchSortDir ? 'text-white' : 'text-[rgb(var(--accent-hover))]/50'}`} />
                                {branchSortDir && (
                                  <span className="text-[9px] lowercase bg-[rgb(var(--accent)_/_0.15)] px-1 py-0.2 rounded font-normal text-[rgb(var(--accent-hover))]">
                                    {branchSortDir}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <Crown className="w-3 h-3" /> Password
                              </div>
                            )}
                          </th>
                        )}
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Role</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Joined</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredUsers.map((user, i) => (
                          <motion.tr
                            key={user._id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-custom last:border-0 hover:bg-card-custom transition-colors"
                          >
                            <td className="px-5 py-4 text-xs text-muted-custom">{i + 1}</td>
                            <td className="px-5 py-4 font-mono text-sm font-semibold text-primary">
                              {user.rollNumber}
                            </td>
                            <td className="px-5 py-4 text-sm text-primary">{user.name}</td>

                            {isSuperAdmin && (
                              <td className="px-5 py-4">
                                {SHOW_BRANCH_INSTEAD_OF_PASSWORD ? (
                                  (() => {
                                    const b = getBranchFromRollNumber(user.rollNumber);
                                    const bLabel = getBranchLabel(b);
                                    return (
                                      <span className="inline-block px-2.5 py-1 text-xs font-bold rounded-lg bg-[rgb(var(--accent)_/_0.1)] text-[rgb(var(--accent-hover))] border border-[rgb(var(--accent)_/_0.2)]">
                                        {bLabel}
                                      </span>
                                    );
                                  })()
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-secondary">
                                      {visiblePasswords.has(user._id)
                                        ? user.plainPassword
                                        : '•'.repeat(Math.min(user.plainPassword?.length ?? 8, 10))}
                                    </span>
                                    <button
                                      onClick={() => togglePassword(user._id)}
                                      className="p-1 rounded text-muted-custom hover:text-[rgb(var(--accent-hover))] transition-colors"
                                      title={visiblePasswords.has(user._id) ? 'Hide' : 'Show'}
                                    >
                                      {visiblePasswords.has(user._id)
                                        ? <EyeOff className="w-3.5 h-3.5" />
                                        : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditPasswordUser({
                                          userId: user._id,
                                          rollNumber: user.rollNumber,
                                          name: user.name,
                                          currentPass: user.plainPassword,
                                        });
                                        setNewPasswordInput(user.plainPassword !== '—' ? user.plainPassword : '');
                                      }}
                                      className="p-1 rounded text-muted-custom hover:text-[rgb(var(--accent-hover))] transition-colors"
                                      title="Edit Password"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}

                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                {user.isSuperAdmin ? (
                                  <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--accent)_/_0.15)] text-[rgb(var(--accent-hover))] text-[10px] font-bold flex items-center gap-1">
                                    <Crown className="w-2.5 h-2.5" /> Super
                                  </span>
                                ) : user.isAdmin ? (
                                  <span className="px-2 py-0.5 rounded-full border border-custom text-secondary text-[10px] font-bold">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-[10px] font-bold">
                                    Student
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 text-xs text-muted-custom">
                              {new Date(user.createdAt).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-5 py-4">
                              {isSuperAdmin && !user.isSuperAdmin && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleAdmin(user._id, !user.isAdmin)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-custom text-secondary hover:text-primary hover:border-[rgb(var(--accent)_/_0.3)] transition-all"
                                  >
                                    {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                                  </button>
                                  <button
                                    onClick={() => deleteUser(user._id)}
                                    className="p-1.5 rounded-lg text-muted-custom hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}

              {!loading && filteredUsers.length === 0 && (
                <div className="p-10 text-center text-secondary text-sm">No users found</div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'pending' ? (
          <motion.div
            key="pending-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Toolbar equivalent */}
            <div className="flex items-center gap-3 mb-6">
              <div className="text-xs text-muted-custom flex items-center gap-2">
                <span>{pendingList.length} pending material{pendingList.length !== 1 ? 's' : ''} awaiting review</span>
                <button
                  type="button"
                  onClick={fetchPending}
                  disabled={pendingLoading}
                  className="p-1.5 rounded-lg border border-custom hover:bg-card-custom hover:text-primary text-secondary transition-all cursor-pointer flex items-center justify-center"
                  title="Refresh pending approvals"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pendingLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Error */}
            {pendingError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                <AlertCircle className="w-4 h-4" /> {pendingError}
              </div>
            )}

            {/* Pending Materials Grid */}
            {pendingLoading ? (
              <div className="card p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--accent-hover))] mx-auto mb-3" />
                <p className="text-secondary text-sm">Loading pending resources...</p>
              </div>
            ) : pendingList.length === 0 ? (
              <div className="card p-12 text-center text-secondary text-sm">
                <ShieldCheck className="w-10 h-10 text-muted-custom mx-auto mb-3" />
                <p className="font-semibold text-primary">All caught up!</p>
                <p className="text-xs text-muted-custom mt-1">No study materials are pending approval.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                  {pendingList.map((res) => {
                    const FileIcon = getFileIcon(res.fileType || 'pdf');
                    return (
                      <motion.div
                        key={res._id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ duration: 0.2 }}
                        className="card p-6 flex flex-col justify-between border border-custom bg-card-custom hover:border-[rgb(var(--accent)_/_0.3)] transition-all duration-200"
                      >
                        <div>
                          {/* File Details Header */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className="w-11 h-11 rounded-xl bg-[rgb(var(--accent)_/_0.1)] border border-[rgb(var(--accent)_/_0.2)] flex items-center justify-center flex-shrink-0">
                              <FileIcon className="w-5 h-5 text-[rgb(var(--accent-hover))]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-primary text-base truncate" title={res.title}>
                                {res.title}
                              </h3>
                              <span className="inline-block px-2 py-0.5 rounded bg-[rgb(var(--accent)_/_0.1)] text-[rgb(var(--accent-hover))] text-[10px] font-bold uppercase tracking-wider mt-1">
                                {res.type === 'qbank' ? 'Question Bank' : res.type === 'pyq' ? 'PYQ' : res.type}
                              </span>
                            </div>
                          </div>

                          {/* Info Fields Grid */}
                          <div className="space-y-3 text-sm text-secondary mb-6">
                            <div className="flex items-center gap-3">
                              <User className="w-4 h-4 text-muted-custom flex-shrink-0" />
                              <span className="truncate">
                                Student: <strong className="text-primary font-medium">{res.studentName}</strong> ({res.uploadedBy})
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <GraduationCap className="w-4 h-4 text-muted-custom flex-shrink-0" />
                              <span>
                                Branch/Semester: <strong className="text-primary font-medium">{res.branch}</strong> (Sem {res.semester})
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <BookOpen className="w-4 h-4 text-muted-custom flex-shrink-0" />
                              <span className="truncate">
                                Subject: <strong className="text-primary font-medium">{res.subject}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-muted-custom flex-shrink-0" />
                              <span>
                                Date Uploaded: <strong className="text-primary font-medium">{new Date(res.createdAt).toLocaleDateString('en-IN')}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action section */}
                        <div className="space-y-4 pt-4 border-t border-custom mt-auto">
                          <div className="flex items-center gap-2">
                            {/* Preview Button */}
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold glass border border-custom text-secondary hover:text-primary transition-all flex items-center justify-center gap-1.5"
                            >
                              <ExternalLink className="w-4 h-4" /> Preview / Download
                            </a>

                            {/* Reject / Approve action buttons (only if not currently expanding rejection details) */}
                            {rejectingId !== res._id && (
                              <>
                                <button
                                  onClick={() => setRejectingId(res._id)}
                                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all flex items-center justify-center gap-1"
                                >
                                  ❌ Reject
                                </button>
                                <button
                                  onClick={() => handleApprove(res._id)}
                                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-1"
                                >
                                  ✅ Approve
                                </button>
                              </>
                            )}
                          </div>

                          {/* Rejection input area */}
                          {rejectingId === res._id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="space-y-3 pt-2"
                            >
                              <div>
                                <label className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">
                                  Reason for Rejection (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. File format is incorrect, wrong subjects selected, poor scan quality..."
                                  value={rejectionReasons[res._id] || ''}
                                  onChange={(e) =>
                                    setRejectionReasons((prev) => ({ ...prev, [res._id]: e.target.value }))
                                  }
                                  className="w-full px-3.5 py-2.5 rounded-xl bg-card-custom border border-custom text-primary placeholder:text-muted-custom text-sm focus:outline-none focus:border-[rgb(var(--accent))] transition-all"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setRejectingId(null);
                                    setRejectionReasons((prev) => ({ ...prev, [res._id]: '' }));
                                  }}
                                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-custom text-secondary hover:text-primary transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleReject(res._id, rejectionReasons[res._id] || '')}
                                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-all"
                                >
                                  Confirm Rejection
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        ) : activeTab === 'issues' ? (
          <motion.div
            key="issues-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Toolbar equivalent */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={fetchIssues}
                className="p-2.5 rounded-xl glass border border-custom text-secondary hover:text-primary transition-all focus:outline-none"
              >
                <RefreshCw className={`w-4 h-4 ${issuesLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-xs text-muted-custom font-semibold">
                {issuesList.filter((i) => i.status === 'pending').length} pending issue{issuesList.filter((i) => i.status === 'pending').length !== 1 ? 's' : ''} awaiting resolution
              </div>
            </div>

            {/* Error */}
            {issuesError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{issuesError}</span>
              </div>
            )}

            {/* Issues List */}
            {issuesLoading ? (
              <div className="card p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--accent-hover))] mx-auto mb-3" />
                <p className="text-secondary text-sm">Loading issues...</p>
              </div>
            ) : issuesList.length === 0 ? (
              <div className="card p-12 text-center text-secondary text-sm">
                <AlertCircle className="w-10 h-10 text-muted-custom mx-auto mb-3" />
                <p className="font-semibold text-primary">All clear!</p>
                <p className="text-xs text-muted-custom mt-1">No student issues have been reported.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {issuesList.map((iss) => {
                  const isPending = iss.status === 'pending';
                  
                  const getSeverityClass = (type: string) => {
                    const t = type.toLowerCase();
                    if (t.includes('missing') || t.includes('login') || t.includes('signup')) {
                      return 'bg-red-500/10 text-red-400 border-red-500/20';
                    }
                    if (t.includes('broken') || t.includes('wrong') || t.includes('youtube')) {
                      return 'bg-[rgb(var(--accent)_/_0.1)] text-[rgb(var(--accent-hover))] border-[rgb(var(--accent)_/_0.2)]';
                    }
                    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  };

                  return (
                    <motion.div
                      key={iss._id}
                      className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 border border-custom bg-card-custom hover:border-[rgb(var(--accent)_/_0.3)] transition-all duration-200"
                    >
                      {/* Left: Student & Issue Details */}
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getSeverityClass(iss.issueType)}`}>
                            {iss.issueType}
                          </span>
                          {iss.subject && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-secondary text-[10px] font-medium border border-custom animate-fade-in">
                              Subject: {iss.subject}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPending ? 'bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                          }`}>
                            {isPending ? '⏳ Pending' : '✅ Resolved'}
                          </span>
                        </div>

                        <div className="text-xs text-secondary flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Student: <strong className="text-primary font-semibold">{iss.studentName}</strong></span>
                          <span>Roll No: <strong className="text-primary font-mono">{iss.studentRollNo}</strong></span>
                          <span>Branch: <strong className="text-primary">{iss.branch}</strong></span>
                          <span>Semester: <strong className="text-primary">Sem {iss.semester}</strong></span>
                          <span>Submitted: <strong className="text-primary font-mono">{new Date(iss.createdAt).toLocaleDateString('en-IN')}</strong></span>
                          {iss.resolvedAt && (
                            <span className="text-emerald-400 font-bold">Resolved: <strong className="font-mono">{new Date(iss.resolvedAt).toLocaleDateString('en-IN')}</strong></span>
                          )}
                        </div>

                        <p className="text-sm text-primary leading-relaxed break-words">
                          {iss.description}
                        </p>
                      </div>

                      {/* Right: Screenshot Preview & Actions */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {iss.screenshotUrl && (
                          <button
                            onClick={() => setLightboxImage(iss.screenshotUrl)}
                            className="w-16 h-16 rounded-xl overflow-hidden border border-custom bg-zinc-950 flex-shrink-0 hover:scale-105 active:scale-95 transition-all relative group focus:outline-none"
                            title="Click to zoom screenshot"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={iss.screenshotUrl} alt="Screenshot" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-semibold transition-opacity">
                              Zoom
                            </div>
                          </button>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => setSelectedIssue(iss)}
                            className="px-3.5 py-2 rounded-xl text-xs font-semibold glass border border-custom text-secondary hover:text-primary transition-all flex items-center justify-center gap-1 focus:outline-none"
                          >
                            <User className="w-3.5 h-3.5" /> View Details
                          </button>
                          {isPending && (
                            <button
                              onClick={() => handleResolveIssue(iss.reportId)}
                              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-1 focus:outline-none"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="activity-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 max-w-4xl"
          >
            {/* Toolbar equivalent */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={fetchActivityLogs}
                disabled={activityLoading}
                className="p-2.5 rounded-xl glass border border-custom text-secondary hover:text-primary transition-all focus:outline-none disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${activityLoading ? 'animate-spin' : ''}`} />
              </button>
              <div className="text-xs text-muted-custom font-semibold">
                Daily visitor logs for the past 7 days (rolling auto-retention)
              </div>
            </div>

            {/* Error */}
            {activityError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                <AlertCircle className="w-4 h-4" /> {activityError}
              </div>
            )}

            {/* Logs List */}
            {activityLoading ? (
              <div className="card p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--accent-hover))] mx-auto mb-3" />
                <p className="text-secondary text-sm">Loading activity logs...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="card p-12 text-center text-secondary text-sm">
                No activity logs available.
              </div>
            ) : (
              <div className="space-y-4">
                {activityLogs.map((dayLog) => {
                  const dateObj = new Date(dayLog.date);
                  const formattedDate = dateObj.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  const isToday = new Date().toDateString() === dateObj.toDateString();
                  const isExpanded = !!expandedDates[dayLog.date];

                  return (
                    <div
                      key={dayLog.date}
                      className="card overflow-hidden border border-custom bg-card-custom/40 transition-all duration-200"
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleDate(dayLog.date)}
                        className="w-full flex items-center justify-between p-5 text-left focus:outline-none hover:bg-card-custom/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isToday ? 'bg-[rgb(var(--accent)_/_0.15)] text-[rgb(var(--accent-hover))] border border-[rgb(var(--accent)_/_0.25)]' : 'bg-zinc-800 text-secondary border border-custom'
                          }`}>
                            <Calendar className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="flex items-center gap-2">
                              <h4 className="font-bold text-primary text-base">
                                {formattedDate}
                              </h4>
                              {isToday && (
                                <span className="text-eyebrow px-2 py-0.5 rounded-full border border-[rgb(var(--accent)_/_0.25)] text-[rgb(var(--accent-hover))]">
                                  Today
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-secondary mt-0.5 block">
                              {dayLog.count} student{dayLog.count !== 1 ? 's' : ''} active
                            </span>
                          </div>
                        </div>
                        <div className="text-secondary hover:text-primary transition-all">
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-xl border border-custom bg-card-custom hover:border-[rgb(var(--accent)_/_0.3)] transition-all`}>
                            {isExpanded ? 'Hide Students' : 'View Students'}
                          </span>
                        </div>
                      </button>

                      {/* Accordion Expand Area */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-custom bg-card-custom/25 overflow-hidden"
                          >
                            <div className="p-5">
                              {dayLog.users.length === 0 ? (
                                <div className="text-secondary text-xs py-2">
                                  No student activity logged for this day.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-2xl border border-custom bg-card-custom/40">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-custom bg-card-custom">
                                        <th className="px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider w-16">#</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Name</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Roll Number</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">Branch</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dayLog.users.map((user: any, index: number) => {
                                        const branch = getBranchFromRollNumber(user.rollNumber);
                                        const branchLabel = getBranchLabel(branch);

                                        return (
                                          <tr
                                            key={user._id || user.rollNumber}
                                            className="border-b border-custom last:border-0 hover:bg-card-custom/60 transition-colors"
                                          >
                                            <td className="px-5 py-3.5 text-xs text-muted-custom font-mono">{index + 1}</td>
                                            <td className="px-5 py-3.5 text-sm font-semibold text-primary">{user.name}</td>
                                            <td className="px-5 py-3.5 text-sm font-mono text-secondary">{user.rollNumber}</td>
                                            <td className="px-5 py-3.5">
                                              <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold rounded bg-[rgb(var(--accent)_/_0.1)] text-[rgb(var(--accent-hover))] border border-[rgb(var(--accent)_/_0.2)]">
                                                {branchLabel}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Issue Details Modal ── */}
      <AnimatePresence>
        {selectedIssue && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl rounded-3xl glass-strong border border-custom bg-card-custom shadow-2xl p-6 overflow-hidden flex flex-col gap-5"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedIssue(null)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-custom border border-transparent hover:border-custom transition-all focus:outline-none"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <span className="text-[10px] font-mono text-muted-custom bg-card-custom px-2 py-0.5 rounded border border-custom uppercase">
                  {selectedIssue.reportId}
                </span>
                <h3 className="text-xl font-extrabold text-primary mt-2">
                  {selectedIssue.issueType}
                </h3>
              </div>

              {/* Student Metadata Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-card-custom/40 border border-custom text-xs">
                <div>
                  <p className="text-muted-custom font-semibold">STUDENT NAME</p>
                  <p className="text-primary font-bold mt-1 text-sm">{selectedIssue.studentName}</p>
                </div>
                <div>
                  <p className="text-muted-custom font-semibold">ROLL NUMBER</p>
                  <p className="text-primary font-mono font-bold mt-1 text-sm">{selectedIssue.studentRollNo}</p>
                </div>
                <div>
                  <p className="text-muted-custom font-semibold">BRANCH / SEMESTER</p>
                  <p className="text-primary font-bold mt-1 text-sm">{selectedIssue.branch} (Sem {selectedIssue.semester})</p>
                </div>
                <div>
                  <p className="text-muted-custom font-semibold">SUBMITTED DATE</p>
                  <p className="text-primary font-bold mt-1 text-sm">{new Date(selectedIssue.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Subject (if provided) */}
              {selectedIssue.subject && (
                <div className="text-sm">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1">
                    Subject context
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-zinc-800 text-[rgb(var(--accent-hover))] font-semibold border border-custom inline-block">
                    {selectedIssue.subject}
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                  Description details
                </span>
                <div className="p-4 rounded-2xl bg-zinc-950/40 border border-custom text-sm text-primary leading-relaxed break-words max-h-40 overflow-y-auto">
                  {selectedIssue.description}
                </div>
              </div>

              {/* Screenshot */}
              {selectedIssue.screenshotUrl && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider block">
                    Report Screenshot
                  </span>
                  <div
                    onClick={() => setLightboxImage(selectedIssue.screenshotUrl)}
                    className="relative max-w-sm aspect-video rounded-2xl overflow-hidden border border-custom bg-zinc-950 cursor-zoom-in group hover:scale-102 transition-transform duration-300"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedIssue.screenshotUrl} alt="Attached screenshot" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                      Click to expand full size
                    </div>
                  </div>
                </div>
              )}

              {/* Footer and resolve action */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-custom mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-custom">Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    selectedIssue.status === 'pending' ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {selectedIssue.status === 'pending' ? '⏳ Pending' : '✅ Resolved'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedIssue(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-custom text-secondary hover:text-primary transition-all focus:outline-none"
                  >
                    Close Details
                  </button>
                  {selectedIssue.status === 'pending' && (
                    <button
                      onClick={() => handleResolveIssue(selectedIssue.reportId)}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 focus:outline-none"
                    >
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Screenshot Lightbox ── */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-5xl max-h-[85vh] rounded-3xl overflow-hidden border border-custom bg-zinc-950 shadow-2xl"
            >
              {/* Close indicator */}
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute right-4 top-4 p-2 rounded-full bg-black/60 backdrop-blur-sm border border-zinc-800 text-white hover:bg-black/80 transition-all focus:outline-none"
                title="Close Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightboxImage} alt="Full resolution screenshot" className="w-auto h-auto max-w-full max-h-[85vh] object-contain" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Active Users Modal ── */}
      <AnimatePresence>
        {showActiveUsersModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl glass-strong border border-custom bg-card-custom shadow-2xl p-6 overflow-hidden flex flex-col gap-4"
            >
              {/* Close button */}
              <button
                onClick={() => setShowActiveUsersModal(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-card-custom border border-transparent hover:border-custom transition-all focus:outline-none"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-lg font-extrabold text-primary">
                  Active Students Online
                </h3>
                <span className="text-xs text-muted-custom bg-card-custom px-2 py-0.5 rounded border border-custom ml-auto mr-8 font-bold">
                  {activeUsersList.length} Online
                </span>
              </div>

              <div className="text-xs text-secondary mb-1">
                Showing students who interacted with the platform in the last 30 seconds.
              </div>

              {/* Active Users List */}
              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2.5">
                {activeUsersList.length === 0 ? (
                  <div className="text-center py-8 text-secondary text-sm">
                    No active students online in the last 30 seconds.
                  </div>
                ) : (
                  activeUsersList.map((user, i) => (
                    <div 
                      key={user._id || user.rollNumber}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-card-custom/40 border border-custom hover:bg-card-custom transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[rgb(var(--accent)_/_0.1)] border border-[rgb(var(--accent)_/_0.25)] flex items-center justify-center text-[rgb(var(--accent-hover))] font-bold text-xs">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary">{user.name}</p>
                          <p className="text-xs font-mono text-secondary">{user.rollNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                          {(() => {
                            if (!user.lastActiveAt) return 'active now';
                            const diffMs = Date.now() - new Date(user.lastActiveAt).getTime();
                            const diffMins = Math.max(0, Math.floor(diffMs / 60000));
                            if (diffMins === 0) return 'active now';
                            if (diffMins === 1) return '1m ago';
                            return `${diffMins}m ago`;
                          })()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-custom mt-2">
                <button
                  onClick={fetchActiveUsers}
                  disabled={activeUsersLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[rgb(var(--accent)_/_0.1)] border border-[rgb(var(--accent)_/_0.2)] text-[rgb(var(--accent-hover))] hover:bg-[rgb(var(--accent)_/_0.15)] transition-all focus:outline-none disabled:opacity-50 select-none"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${activeUsersLoading ? 'animate-spin' : ''}`} />
                  {activeUsersLoading ? 'Refreshing...' : 'Refresh List'}
                </button>
                <button
                  onClick={() => setShowActiveUsersModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-custom text-secondary hover:text-primary transition-all focus:outline-none"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Password Modal ── */}
      <AnimatePresence>
        {editPasswordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-sm glass-strong rounded-2xl p-6 border border-custom relative shadow-2xl space-y-4"
            >
              <button
                onClick={() => setEditPasswordUser(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-muted-custom hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgb(var(--accent)_/_0.1)] border border-[rgb(var(--accent)_/_0.2)] text-[rgb(var(--accent-hover))] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-base">Edit Password</h3>
                  <p className="text-xs font-mono text-secondary">{editPasswordUser.rollNumber} ({editPasswordUser.name})</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1 block">New Password</label>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full px-4 py-2.5 rounded-xl bg-card-custom border border-custom text-primary font-mono text-sm focus:outline-none focus:border-[rgb(var(--accent))]"
                  autoFocus
                />
                <p className="text-[11px] text-muted-custom mt-1">Changes take effect immediately for the student.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditPasswordUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-custom text-secondary hover:text-primary transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePassword}
                  disabled={savingPassword || !newPasswordInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-bold gradient-accent text-white glow-accent disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {savingPassword ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
