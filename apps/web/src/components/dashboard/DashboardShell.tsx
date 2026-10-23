import { type CSSProperties } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserRound,
  CheckSquare,
  FileText,
  Gauge,
  ScrollText,
  BellRing,
  Users as UsersIcon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  UserCheck,
  Eye,
  Star,
  Award,
} from "lucide-react";
import * as Sidebar from "@animate-ui/react/primitives/sidebar";
import { Bell } from "../animate-ui/icons/bell";
import { cn } from "../../lib/cn";
import { focus, muted } from "../../lib/styles";
import { useAuth } from "../../context/AuthContext";
import ThemeTogglerDemo from "../ThemeToggler";
import type { UserRole } from "../../lib/api";

const NAV: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound },
  { to: "/dashboard/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/dashboard/report", label: "Report", icon: FileText },
  { to: "/dashboard/score", label: "Score", icon: Gauge },
  { to: "/dashboard/ratings", label: "Ratings & Reputation", icon: Star },
  { to: "/dashboard/publicity", label: "Publicity & Badges", icon: Award },
  { to: "/dashboard/audit", label: "Audit", icon: ScrollText },
  { to: "/dashboard/alerts", label: "Alerts", icon: BellRing },
  { to: "/dashboard/users", label: "Users & Roles", icon: UsersIcon },
];

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "OWNER") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
        <UserCheck className="h-3 w-3" />
        Owner
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
      <Eye className="h-3 w-3" />
      Viewer
    </span>
  );
}

function NavItems({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <nav className="flex flex-col gap-1 px-2" aria-label="Dashboard">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          data-sidebar="menu-button"
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center rounded-lg text-sm font-medium transition-all duration-200",
              collapsed ? "justify-center h-10 w-10 mx-auto px-0" : "gap-3 px-3 py-2",
              isActive
                ? "text-[var(--foreground)] bg-black/5 dark:bg-white/10 shadow-sm"
                : muted,
              !isActive && "hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5",
              focus,
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" strokeWidth={1.75} />
          {!collapsed && <span className="truncate">{label}</span>}
          {collapsed && (
            <div className="pointer-events-none absolute left-full ml-3 hidden rounded-md bg-neutral-900 border border-neutral-700/80 px-2.5 py-1 text-xs font-medium text-white shadow-xl z-50 whitespace-nowrap group-hover:block animate-in fade-in zoom-in-95 duration-150">
              {label}
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate, collapsed }: { onNavigate?: () => void; collapsed?: boolean }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const activeRole: UserRole = user?.role || "OWNER";

  return (
    <>
      <div
        className={cn(
          "flex h-14 items-center border-b border-[var(--border)] transition-all duration-200",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {collapsed ? (
          <Link
            to="/"
            title="ListoraAI Home"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-[var(--border)] text-[var(--foreground)] font-bold text-sm tracking-wider shadow-sm hover:scale-105 transition-transform",
              focus,
            )}
          >
            L
          </Link>
        ) : (
          <>
            <Link to="/" className={cn("text-base font-semibold tracking-tight hover:opacity-80 transition-opacity", focus)}>
              ListoraAI
            </Link>
            <RoleBadge role={activeRole} />
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {!collapsed ? (
          <p className={cn("mb-2 px-5 text-[11px] font-medium uppercase tracking-wider", muted)}>
            Workspace
          </p>
        ) : (
          <div className="mb-3 h-px w-6 mx-auto bg-black/10 dark:bg-white/10" />
        )}
        <NavItems onNavigate={onNavigate} collapsed={collapsed} />
      </div>

      {/* User profile & Logout */}
      <div className={cn("border-t border-[var(--border)]", collapsed ? "p-2 flex flex-col items-center gap-2" : "p-3 space-y-2")}>
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between px-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--foreground)] truncate">{user?.name || "Active Session"}</p>
                <p className={`text-[11px] truncate ${muted}`}>{user?.email || "operator@listora.ai"}</p>
              </div>
              <RoleBadge role={activeRole} />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                muted,
                "hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
                focus,
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              <span>Log out</span>
            </button>
          </>
        ) : (
          <>
            <div
              title={`${user?.name || "User"} (${activeRole})`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] cursor-default"
            >
              {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className={cn(
                "group relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
                focus,
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              <div className="pointer-events-none absolute left-full ml-3 hidden rounded-md bg-neutral-900 border border-neutral-700/80 px-2.5 py-1 text-xs font-medium text-white shadow-xl z-50 whitespace-nowrap group-hover:block animate-in fade-in zoom-in-95 duration-150">
                Log out
              </div>
            </button>
          </>
        )}
      </div>
    </>
  );
}

function DesktopSidebar() {
  const { isMobile, openMobile, setOpenMobile, open } = Sidebar.useSidebar();

  if (isMobile) {
    if (!openMobile) return null;
    return (
      <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
        <button
          type="button"
          aria-label="Close menu"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpenMobile(false)}
        />
        <div className="relative flex h-full w-[16rem] flex-col border-r border-[var(--border)] bg-[var(--sidebar)] shadow-2xl">
          <SidebarBody onNavigate={() => setOpenMobile(false)} collapsed={false} />
        </div>
      </div>
    );
  }

  const widthClass = open ? "w-[15.5rem]" : "w-[4.25rem]";

  return (
    <>
      <div className={cn("hidden shrink-0 transition-all duration-300 ease-in-out md:block", widthClass)} />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-svh border-r border-[var(--border)] bg-[var(--sidebar)] transition-all duration-300 ease-in-out md:flex md:flex-col overflow-hidden",
          widthClass,
        )}
      >
        <SidebarBody collapsed={!open} />
      </aside>
    </>
  );
}

function ShellChrome() {
  const { toggleSidebar, isMobile, openMobile, open } = Sidebar.useSidebar();
  const { user } = useAuth();
  const activeRole: UserRole = user?.role || "OWNER";
  const isOpen = isMobile ? openMobile : open;

  return (
    <>
      <DesktopSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur-sm md:px-6">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={isOpen ? "Collapse sidebar (Ctrl+B)" : "Expand sidebar (Ctrl+B)"}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-[var(--foreground)]",
              focus,
            )}
          >
            {isOpen ? (
              <PanelLeftClose className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>

          <div className="ml-auto flex items-center gap-3">
            <Link to="/dashboard/users" className="hover:opacity-80 transition-opacity">
              <RoleBadge role={activeRole} />
            </Link>

            <NavLink
              to="/dashboard/alerts"
              className={cn(
                "relative grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--foreground)]",
                focus,
              )}
              aria-label="Alerts"
            >
              <Bell size={16} animateOnHover />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            </NavLink>

            <ThemeTogglerDemo />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </>
  );
}

export default function DashboardShell() {
  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--foreground)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 dark:bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,rgba(255,255,255,0.05),transparent_55%)] bg-[radial-gradient(ellipse_70%_45%_at_0%_0%,rgba(15,23,42,0.03),transparent_55%)]"
      />
      <Sidebar.Provider
        defaultOpen
        className="relative flex min-h-svh w-full"
        style={
          {
            "--sidebar-width": "15.5rem",
            "--sidebar-width-icon": "4.25rem",
          } as CSSProperties
        }
      >
        <ShellChrome />
      </Sidebar.Provider>
    </div>
  );
}
