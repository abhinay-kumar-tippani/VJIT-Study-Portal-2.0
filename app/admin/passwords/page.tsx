// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Crown, Loader2, AlertCircle, RefreshCw,
  KeyRound, User, Hash, Pencil, Search, X, CheckCircle2
} from 'lucide-react';
import { toast } from '@/components/ui/toaster';

interface PasswordRow {
  _id: string;
  index: number;
  rollNumber: string;
  name: string;
  plainPassword: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export default function PasswordsPage() {
  const [users, setUsers] = useState<PasswordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Edit Password Modal State
  const [editUser, setEditUser] = useState<PasswordRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPasswords = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/passwords');
      if (res.status === 403) {
        setError('Access denied. This page is for Super Admin only.');
        return;
      }
      if (res.status === 401) {
        setError('You are not logged in.');
        return;
      }
      if (!res.ok) {
        setError('Failed to load data.');
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswords();
  }, []);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser || !newPassword.trim()) return;

    if (newPassword.trim().length < 6) {
      toast({
        variant: 'error',
        title: 'Invalid Password',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/passwords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNumber: editUser.rollNumber,
          newPassword: newPassword.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          variant: 'error',
          title: 'Failed to update',
          description: data.error || 'Could not update password.',
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Password Updated! 🎉',
        description: `Successfully updated password for ${editUser.rollNumber} (${editUser.name}).`,
      });

      setEditUser(null);
      setNewPassword('');
      fetchPasswords();
    } catch {
      toast({
        variant: 'error',
        title: 'Network error',
        description: 'Failed to update password.',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.rollNumber.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.plainPassword.toLowerCase().includes(q)
    );
  });

  const inputClass = `
    w-full px-4 py-2.5 rounded-xl bg-card-custom border border-custom
    text-primary placeholder:text-muted-custom text-sm font-mono
    focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20
    transition-all duration-150
  `;

  return (
    <div className="min-h-screen px-6 py-10 md:px-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-primary flex items-center gap-2">
              Student Passwords
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                <Crown className="w-2.5 h-2.5" /> SUPER ADMIN
              </span>
            </h1>
            <p className="text-xs text-muted-custom mt-0.5">
              All registered student credentials — click the pencil icon to edit any password directly
            </p>
          </div>
        </div>
      </motion.div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card p-16 text-center">
          <Loader2 className="w-9 h-9 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-secondary text-sm">Loading credentials...</p>
        </div>
      )}

      {/* Table & Controls */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card overflow-hidden"
        >
          {/* Table Toolbar */}
          <div className="px-6 py-4 border-b border-custom flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <User className="w-4 h-4 text-muted-custom" />
              <span>
                <strong className="text-primary">{filteredUsers.length}</strong> of{' '}
                <strong className="text-primary">{users.length}</strong> registered students
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-custom" />
                <input
                  type="text"
                  placeholder="Search roll no, name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-card-custom border border-custom text-xs text-primary placeholder:text-muted-custom focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={fetchPasswords}
                className="p-2 rounded-xl glass border border-custom text-secondary hover:text-primary transition-all flex-shrink-0"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-custom bg-card-custom">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3 h-3" /> #
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                    Roll No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3 h-3" /> Password & Edit
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, i) => (
                  <motion.tr
                    key={user.rollNumber}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="border-b border-custom last:border-0 hover:bg-card-custom transition-colors group"
                  >
                    <td className="px-6 py-4 text-xs text-muted-custom font-mono">
                      {i + 1}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-primary">
                      {user.rollNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary font-medium">
                      {user.name}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {user.plainPassword}
                        </span>
                        <button
                          onClick={() => {
                            setEditUser(user);
                            setNewPassword(user.plainPassword !== '—' ? user.plainPassword : '');
                          }}
                          className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:scale-105 transition-all cursor-pointer"
                          title="Edit Password"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.isSuperAdmin ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1 w-fit">
                          <Crown className="w-2.5 h-2.5" /> Super
                        </span>
                      ) : user.isAdmin ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold w-fit block">
                          Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-[10px] font-bold w-fit block">
                          Student
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="p-12 text-center text-secondary text-sm">
              No students found matching &ldquo;{search}&rdquo;
            </div>
          )}
        </motion.div>
      )}

      {/* Edit Password Modal */}
      <AnimatePresence>
        {editUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-sm glass-strong rounded-2xl p-6 border border-amber-500/30 relative shadow-2xl space-y-4"
            >
              <button
                onClick={() => setEditUser(null)}
                className="absolute top-4 right-4 p-1 rounded-lg text-muted-custom hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-primary text-base">Edit Password</h3>
                  <p className="text-xs font-mono text-amber-400">{editUser.rollNumber} — {editUser.name}</p>
                </div>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">
                    New Password
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="e.g. 123456, 123456789, qwerty..."
                    required
                    autoFocus
                    className={inputClass}
                  />
                  <p className="text-[11px] text-muted-custom mt-1.5">
                    Type any new password (min 6 chars). Changes take effect instantly.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditUser(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border border-custom text-secondary hover:text-primary transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !newPassword.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {saving ? 'Saving...' : 'Save Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
