// @ts-nocheck

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Crown, Loader2, AlertCircle, RefreshCw,
  KeyRound, User, Hash
} from 'lucide-react';

interface PasswordRow {
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

  return (
    <div className="min-h-screen px-6 py-10 md:px-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
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
              All registered student credentials — confidential
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

      {/* Table */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="card overflow-hidden"
        >
          {/* Table meta */}
          <div className="px-6 py-4 border-b border-custom flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-secondary">
              <User className="w-4 h-4 text-muted-custom" />
              <span>
                <strong className="text-primary">{users.length}</strong> registered students
              </span>
            </div>
            <button
              onClick={fetchPasswords}
              className="p-2 rounded-xl glass border border-custom text-secondary hover:text-primary transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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
                      <KeyRound className="w-3 h-3" /> Password
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr
                    key={user.rollNumber}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
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
                      <span className="font-mono text-sm font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {user.plainPassword}
                      </span>
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

          {users.length === 0 && (
            <div className="p-12 text-center text-secondary text-sm">
              No students found.
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
