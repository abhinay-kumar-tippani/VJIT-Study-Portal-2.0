'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Users, Search, Eye, EyeOff,
  Trash2, Crown, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import type { AdminUserRow } from '@/types';

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        setError('Failed to load users');
        return;
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      // Check if current session is super admin by presence of plainPassword
      if (data.users?.[0]?.plainPassword !== undefined) setIsSuperAdmin(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

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

  const filtered = users.filter(
    (u) =>
      u.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase())
  );

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
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  <Crown className="w-2.5 h-2.5" /> SUPER ADMIN
                </span>
              )}
              <span className="text-xs text-secondary">{users.length} registered students</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3 mb-6"
      >
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
              focus:outline-none focus:border-indigo-500 transition-all
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
          {filtered.length} of {users.length}
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card overflow-hidden"
      >
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
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
                  {/* Password column — ONLY renders for super admin */}
                  {isSuperAdmin && (
                    <th className="px-5 py-3 text-left text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <Crown className="w-3 h-3" /> Password
                      </div>
                    </th>
                  )}
                  <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Joined</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((user, i) => (
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

                      {/* Password cell — ONLY for super admin */}
                      {isSuperAdmin && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-amber-300">
                              {visiblePasswords.has(user._id)
                                ? user.plainPassword
                                : '•'.repeat(Math.min(user.plainPassword?.length ?? 8, 10))}
                            </span>
                            <button
                              onClick={() => togglePassword(user._id)}
                              className="p-1 rounded text-muted-custom hover:text-amber-400 transition-colors"
                              title={visiblePasswords.has(user._id) ? 'Hide' : 'Show'}
                            >
                              {visiblePasswords.has(user._id)
                                ? <EyeOff className="w-3.5 h-3.5" />
                                : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          {user.isSuperAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" /> Super
                            </span>
                          ) : user.isAdmin ? (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
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
                              className="px-2.5 py-1 rounded-lg text-xs font-medium border border-custom text-secondary hover:text-primary hover:border-indigo-500/50 transition-all"
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

        {!loading && filtered.length === 0 && (
          <div className="p-10 text-center text-secondary text-sm">No users found</div>
        )}
      </motion.div>
    </div>
  );
}
