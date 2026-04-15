// src/app/dashboard/admin/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, ShieldCheck, Trash2, RefreshCw, KeyRound } from "lucide-react";
import type { UserRole } from "@/lib/types";

interface AdminUser {
  id: number;
  username: string;
  role: UserRole;
  has_key: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "user",                 label: "User"                 },
  { value: "admin",                label: "Admin"                },
  { value: "system_manager",       label: "System Manager"       },
  { value: "system_administrator", label: "System Administrator" },
];

const ROLE_COLORS: Record<UserRole, string> = {
  user:                 "bg-navy-100 text-navy-700",
  admin:                "bg-blue-100 text-blue-700",
  system_manager:       "bg-purple-100 text-purple-700",
  system_administrator: "bg-red-100 text-red-700",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<number | null>(null);
  const [myRole, setMyRole] = useState<UserRole>("user");
  const [actionStatus, setActionStatus] = useState<Record<number, string>>({});
  const [resetModal, setResetModal] = useState<{ userId: number; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/users`, { headers: authHeader() });
      if (res.status === 403) { setUsers([]); return; }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) {
      const parsed = JSON.parse(u);
      setMyId(parsed.id);
      setMyRole(parsed.role ?? "user");
    }
    loadUsers();
  }, [loadUsers]);

  const canManage = myRole === "system_manager" || myRole === "system_administrator";

  const setStatus = (userId: number, msg: string) =>
    setActionStatus((prev) => ({ ...prev, [userId]: msg }));

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setStatus(userId, "Saving…");
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(userId, "✅ Saved");
      await loadUsers();
    } catch (err) {
      setStatus(userId, `❌ ${err instanceof Error ? err.message : "Error"}`);
    }
    setTimeout(() => setStatus(userId, ""), 3000);
  };

  const handleDelete = async (userId: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    setStatus(userId, "Deleting…");
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadUsers();
    } catch (err) {
      setStatus(userId, `❌ ${err instanceof Error ? err.message : "Error"}`);
      setTimeout(() => setStatus(userId, ""), 3000);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetModal) return;
    setResetting(true);
    try {
      const res = await fetch(`${API_URL}/admin/users/${resetModal.userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ Password for "${resetModal.username}" has been reset.\n\nGive them this temporary password:\n\n${newPassword}\n\nThey must log in and re-register their encryption keys.`);
      setResetModal(null);
      setNewPassword("");
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setResetting(false);
    }
  };

  const isProtectedRole = (role: UserRole) =>
    role === "system_manager" || role === "system_administrator";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-900 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 mb-2 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-navy-600">
            {canManage
              ? "Manage users, assign roles, and reset passwords."
              : "View registered users. Only System Managers and Administrators can manage users."}
          </p>
        </div>
        <button
          onClick={loadUsers}
          className="p-2 rounded-lg hover:bg-navy-100 transition-colors text-navy-600"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["user", "admin", "system_manager", "system_administrator"] as UserRole[]).map((r) => (
          <div key={r} className="card p-4 text-center">
            <p className="text-2xl font-bold text-navy-900">
              {users.filter((u) => u.role === r).length}
            </p>
            <p className="text-xs text-navy-600 capitalize mt-1">
              {r.replace(/_/g, " ")}s
            </p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-navy-100 flex items-center gap-3">
          <Users className="w-5 h-5 text-navy-700" />
          <h2 className="text-lg font-bold text-navy-900">All Users ({users.length})</h2>
        </div>

        <div className="divide-y divide-navy-50">
          {users.map((u) => {
            const isSelf = u.id === myId;
            return (
              <div key={u.id} className="flex items-center gap-4 px-6 py-4 flex-wrap">
                {/* Avatar + name */}
                <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center font-bold text-navy-700 flex-shrink-0">
                  {u.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-900 flex items-center gap-2">
                    {u.username}
                    {isSelf && <span className="text-xs text-navy-400">(you)</span>}
                  </p>
                  <p className="text-xs text-navy-500">
                    ID: {u.id} · {u.has_key ? "🔑 Has key" : "⚠️ No key"}
                  </p>
                </div>

                {/* Current role badge */}
                <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                  {u.role.replace(/_/g, " ")}
                </span>

                {/* Role selector */}
                {canManage && !isSelf && (
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="text-sm border border-navy-200 rounded-lg px-2 py-1.5 text-navy-900 bg-white focus:outline-none focus:ring-2 focus:ring-navy-400 flex-shrink-0"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}

                {/* Action status */}
                {actionStatus[u.id] && (
                  <span className="text-xs text-navy-500 flex-shrink-0">{actionStatus[u.id]}</span>
                )}

                {/* Reset password */}
                {canManage && !isSelf && (
                  <button
                    onClick={() => { setResetModal({ userId: u.id, username: u.username }); setNewPassword(""); }}
                    className="p-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors flex-shrink-0"
                    title="Reset password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                )}

                {/* Delete — cannot delete self or other privileged users */}
                {canManage && !isSelf && !isProtectedRole(u.role) && (
                  <button
                    onClick={() => handleDelete(u.id, u.username)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex-shrink-0"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission info box */}
      <div className="card p-5 bg-navy-50 border border-navy-200">
        <h3 className="font-semibold text-navy-900 mb-3">Role Permissions</h3>
        <div className="space-y-2 text-sm text-navy-700">
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-full bg-navy-100 text-navy-700 font-medium text-xs whitespace-nowrap">User</span>
            <span>Upload, download, and share their own files.</span>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium text-xs whitespace-nowrap">Admin</span>
            <span>All user permissions + view all activity logs + view user list.</span>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium text-xs whitespace-nowrap">Sys Manager</span>
            <span>All admin permissions + assign roles + delete users + reset passwords.</span>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium text-xs whitespace-nowrap">Sys Admin</span>
            <span>Full access — same as System Manager.</span>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-3">
              <KeyRound className="w-6 h-6 text-yellow-600" />
              <h2 className="text-xl font-bold text-navy-900">Reset Password</h2>
            </div>
            <p className="text-navy-600 text-sm">
              Set a new temporary password for <strong>{resetModal.username}</strong>.
              Their encryption keys will be cleared — they must log in and re-register keys.
            </p>
            <div>
              <label className="block text-sm font-semibold text-navy-700 mb-1.5">
                New Temporary Password
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter temporary password (min 6 chars)"
                className="w-full border border-navy-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setResetModal(null); setNewPassword(""); }}
                className="flex-1 py-2.5 border border-navy-200 rounded-xl text-sm font-semibold text-navy-700 hover:bg-navy-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={newPassword.length < 6 || resetting}
                className="flex-1 py-2.5 bg-yellow-600 text-white rounded-xl text-sm font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetting ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
