import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthShell, fieldClass, labelClass, primaryBtnClass } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../lib/api";
import { focus, muted } from "../lib/styles";
import { UserCheck, Eye, Lock } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const redirectMessage = (location.state as { message?: string })?.message;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login({ email: email.trim(), password });
      const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard";
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
    } finally {
      setPending(false);
    }
  }

  function fillDemo(role: UserRole) {
    if (role === "OWNER") {
      setEmail("owner@listora.ai");
      setPassword("password123");
    } else {
      setEmail("viewer@listora.ai");
      setPassword("password123");
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to review mismatches, monitor ratings, and manage business consistency."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className={`font-medium text-[var(--foreground)] underline-offset-4 hover:underline ${focus}`}>
            Create an account
          </Link>
        </>
      }
    >
      {redirectMessage && !error && (
        <div className="mb-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 text-sm text-indigo-300 flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-indigo-400" />
          <span>{redirectMessage}</span>
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="you@business.com"
          />
        </div>
        <div>
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
            placeholder="••••••••"
          />
        </div>

        {/* Demo Role Presets */}
        <div className="rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-black/40 p-3">
          <p className={`text-[11px] font-medium uppercase tracking-wider mb-2 ${muted}`}>
            Quick Demo Role Login:
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => fillDemo("OWNER")}
              className="flex items-center justify-center gap-1.5 rounded border border-[var(--border)] bg-white dark:bg-white/5 py-1.5 px-2 hover:bg-black/5 dark:hover:bg-white/15 transition-colors text-[var(--foreground)] shadow-xs"
            >
              <UserCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Owner</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo("VIEWER")}
              className="flex items-center justify-center gap-1.5 rounded border border-[var(--border)] bg-white dark:bg-white/5 py-1.5 px-2 hover:bg-black/5 dark:hover:bg-white/15 transition-colors text-[var(--foreground)] shadow-xs"
            >
              <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Viewer</span>
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={primaryBtnClass}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
