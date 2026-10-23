import { useState, useEffect } from "react";
import { Users as UsersIcon, UserCheck, Eye, Check, RefreshCw } from "lucide-react";
import { listUsers, updateUserRole, type UserProfile, type UserRole } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/cn";
import { focus, muted } from "../lib/styles";

const ROLE_CONFIG: Record<UserRole, { label: string; tone: string; icon: typeof UserCheck; desc: string }> = {
  OWNER: {
    label: "Owner",
    tone: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: UserCheck,
    desc: "Full workspace ownership: manage profile, run AI, approve/publish responses & configure alerts.",
  },
  VIEWER: {
    label: "Viewer",
    tone: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: Eye,
    desc: "Read-only access to consistency scores, reputation monitoring, audit trails, and alerts.",
  },
};

export default function Users() {
  const { user: currentUser, updateUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await listUsers();
        setUsers(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      if (currentUser?.id === userId) {
        const updated = { ...currentUser, role: newRole };
        updateUser(updated);
      }
      setSuccessMsg(`Role successfully updated to ${newRole}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // Local demo fallback
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      if (currentUser?.id === userId) {
        const updated = { ...currentUser, role: newRole };
        updateUser(updated);
      }
      setSuccessMsg(`Role switched to ${newRole} (Demo mode)`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSwitchCurrentRole = (newRole: UserRole) => {
    const updated: UserProfile = {
      id: currentUser?.id || "demo-current",
      email: currentUser?.email || "user@listora.ai",
      name: currentUser?.name || "Active User",
      role: newRole,
    };
    updateUser(updated);
    setSuccessMsg(`Simulating active session as: ${newRole}`);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 800);
  };

  const activeRole = currentUser?.role || "OWNER";
  const isOwner = activeRole === "OWNER";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-[var(--primary)]" />
            Users & Role Management
          </h1>
          <p className={`mt-1 text-sm ${muted}`}>
            Role-based access control (RBAC) governing profile edits, approvals, reputation monitoring, and system observability.
          </p>
        </div>

        {/* Demo Role Switcher */}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-xs shadow-sm">
          <span className={`font-medium ${muted}`}>Switch Role:</span>
          {(["OWNER", "VIEWER"] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleSwitchCurrentRole(r)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                activeRole === r
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5",
                focus
              )}
            >
              {r === "OWNER" ? "Owner" : "Viewer"}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Role Permission Matrix Card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4 shadow-sm">
        <h2 className="text-base font-semibold">Permission Matrix by Role</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                <th className="py-2.5 pr-4 font-medium">Capability</th>
                <th className="py-2.5 px-4 font-medium text-amber-600 dark:text-amber-400">Owner</th>
                <th className="py-2.5 px-4 font-medium text-blue-600 dark:text-blue-400">Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[
                { cap: "View Dashboard, Score, Ratings, Reports & Audit Log", op: true, viewer: true },
                { cap: "Search, Sort, and Filter Ratings & Reviews", op: true, viewer: true },
                { cap: "Read AI Reputation Insights & Suggested Responses", op: true, viewer: true },
                { cap: "Review Mismatches & Run AI Listing Investigator", op: true, viewer: false },
                { cap: "Approve or Reject Sync Proposals", op: true, viewer: false },
                { cap: "Generate & Edit AI Review Responses", op: true, viewer: false },
                { cap: "Publish Review Responses & Configure Alert Thresholds", op: true, viewer: false },
                { cap: "Edit Canonical Business Profile & Manage Users", op: true, viewer: false },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-4 font-medium text-[var(--foreground)]">{row.cap}</td>
                  <td className="py-2.5 px-4 text-amber-600 dark:text-amber-400">{row.op ? "✓ Allowed" : "— Read Only"}</td>
                  <td className="py-2.5 px-4 text-blue-600 dark:text-blue-400">{row.viewer ? "✓ Allowed" : "— Forbidden"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Active Workspace Users</h2>
            <p className={`text-xs ${muted}`}>
              {isOwner ? "You can change user roles below." : "Viewing only (Owner role required to alter workspace user roles)."}
            </p>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-neutral-400" />}
        </div>

        <div className="divide-y divide-[var(--border)]">
          {users.map((u) => {
            const config = ROLE_CONFIG[u.role] || ROLE_CONFIG.OWNER;
            const Icon = config.icon;
            const isMe = u.email === currentUser?.email;

            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                <div className="flex items-start gap-3">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", config.tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--foreground)]">{u.name || u.email}</span>
                      {isMe && (
                        <span className="rounded bg-black/10 dark:bg-white/10 px-1.5 py-0.5 text-[10px] text-neutral-400">You</span>
                      )}
                    </div>
                    <p className={`text-xs ${muted}`}>{u.email}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">{config.desc}</p>
                  </div>
                </div>

                {/* Role select dropdown / badge */}
                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  {isOwner ? (
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className={cn(
                        "rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] outline-none transition-colors",
                        focus
                      )}
                    >
                      <option value="OWNER">Owner (Full Management)</option>
                      <option value="VIEWER">Viewer (Read-Only Monitoring)</option>
                    </select>
                  ) : (
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", config.tone)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
