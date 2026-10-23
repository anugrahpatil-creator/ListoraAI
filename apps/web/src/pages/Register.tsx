import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell, fieldClass, labelClass, primaryBtnClass } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../lib/api";
import { focus, muted } from "../lib/styles";
import { UserCheck, Eye } from "lucide-react";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("OWNER");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Select your organizational role to start collaborating."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className={`font-medium text-[var(--foreground)] underline-offset-4 hover:underline ${focus}`}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="register-name" className={labelClass}>
            Name
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            placeholder="Alex Rivers"
          />
        </div>
        <div>
          <label htmlFor="register-email" className={labelClass}>
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            placeholder="alex@business.com"
          />
        </div>

        {/* Role Selector */}
        <div>
          <label className={labelClass}>Select Role</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => setRole("OWNER")}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                role === "OWNER"
                  ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm"
                  : "border-[var(--border)] bg-slate-50 dark:bg-white/5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <UserCheck className="h-4 w-4" />
              <span className="font-medium">Owner</span>
              <span className="text-[10px] opacity-70">Full Management</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("VIEWER")}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs transition-colors ${
                role === "VIEWER"
                  ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm"
                  : "border-[var(--border)] bg-slate-50 dark:bg-white/5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <Eye className="h-4 w-4" />
              <span className="font-medium">Viewer</span>
              <span className="text-[10px] opacity-70">Read-Only</span>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className={labelClass}>
            Password
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
            placeholder="At least 6 characters"
          />
        </div>
        <div>
          <label htmlFor="register-confirm" className={labelClass}>
            Confirm password
          </label>
          <input
            id="register-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={fieldClass}
            placeholder="Repeat password"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={primaryBtnClass}>
          {pending ? "Creating account…" : `Create ${role.toLowerCase()} account`}
        </button>

        <p className={`text-xs leading-relaxed text-center ${muted}`}>
          Role permissions: <span className="text-amber-400 font-medium">Owner</span> (manage profile, approvals, AI responses & sync),{" "}
          <span className="text-blue-400 font-medium">Viewer</span> (read-only audit, reports & reputation monitoring).
        </p>
      </form>
    </AuthShell>
  );
}
