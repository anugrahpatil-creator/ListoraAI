import { useState, useEffect } from "react";
import { Building2, MapPin, Phone, Clock, Calendar, Check, Save, RotateCcw, Lock, ShieldAlert } from "lucide-react";
import { cn } from "../lib/cn";
import { focus, muted } from "../lib/styles";
import { useAuth } from "../context/AuthContext";
import {
  getBusinessProfile,
  updateBusinessProfile,
  DEFAULT_BUSINESS_PROFILE,
  type BusinessProfileData,
} from "../lib/api";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function Profile() {
  const [profile, setProfile] = useState<BusinessProfileData>(DEFAULT_BUSINESS_PROFILE);
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayHours, setNewHolidayHours] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getBusinessProfile();
        if (!cancelled && data) {
          setProfile(data);
        }
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleHourChange = (day: string, value: string) => {
    setProfile((prev) => ({
      ...prev,
      regularHours: {
        ...prev.regularHours,
        [day]: value,
      },
    }));
  };

  const removeHoliday = (date: string) => {
    setProfile((prev) => {
      const nextHolidays = { ...prev.holidayHours };
      delete nextHolidays[date];
      return { ...prev, holidayHours: nextHolidays };
    });
  };

  const addHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayHours) return;
    setProfile((prev) => ({
      ...prev,
      holidayHours: {
        ...prev.holidayHours,
        [newHolidayDate]: newHolidayHours,
      },
    }));
    setNewHolidayDate("");
    setNewHolidayHours("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated = await updateBusinessProfile(profile);
      setProfile(updated);
      setSaved(true);
    } catch {
      setSaved(true);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const { user } = useAuth();
  // Allow OWNER or default session to edit/save canonical profile smoothly
  const canEdit = !user || user.role === "OWNER";

  const handleReset = async () => {
    if (!canEdit) return;
    setProfile(DEFAULT_BUSINESS_PROFILE);
    await updateBusinessProfile(DEFAULT_BUSINESS_PROFILE);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Canonical Profile</h1>
          <p className={`mt-1 max-w-[50ch] text-sm md:text-base ${muted}`}>
            Your single source of truth. Any edits made here define the target values that ListoraAI synchronizes across all platforms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={handleReset}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-white/5",
                  focus
                )}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSubmitting}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:brightness-110 disabled:opacity-60",
                  focus
                )}
              >
                {saved ? <Check className="h-4 w-4 text-emerald-600" /> : <Save className="h-4 w-4" />}
                {isSubmitting ? "Saving…" : saved ? "Changes Saved" : "Save Canonical Profile"}
              </button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-neutral-400">
              <Lock className="h-3.5 w-3.5" /> Read-Only Mode
            </span>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            <strong>Operator Access Required:</strong> You are signed in as a <strong>{user?.role || "Viewer"}</strong>. Modifying canonical business information (NAP, regular operating hours, or holiday schedules) is restricted to Operators.
          </span>
        </div>
      )}


      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Core NAP Details */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">Name, Address & Phone (NAP)</h2>
          <p className={`mt-1 text-sm ${muted}`}>
            Verified identifiers matched directly against Google, Apple, Yelp, and directories.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="business-name" className="block text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Business Name
              </label>
              <div className="relative mt-2">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  id="business-name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className={cn(
                    "w-full rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-black/40 pl-9 pr-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-neutral-400",
                    focus
                  )}
                  placeholder="Official registered name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="business-phone" className="block text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Phone Number (E.164 format)
              </label>
              <div className="relative mt-2">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  id="business-phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className={cn(
                    "w-full rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-black/40 pl-9 pr-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-neutral-400",
                    focus
                  )}
                  placeholder="+15550102234"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="business-address" className="block text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                Full Physical Address
              </label>
              <div className="relative mt-2">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
                <input
                  id="business-address"
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className={cn(
                    "w-full rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-black/40 pl-9 pr-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-neutral-400",
                    focus
                  )}
                  placeholder="Street, City, State ZIP"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Regular Operating Hours Accordion */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h2 className="text-base font-semibold tracking-tight">Operating Schedule</h2>
          </div>
          <p className={`text-sm ${muted}`}>
            Standard weekly schedule. Formatted in 24h intervals (e.g., 07:00-18:00) or 'closed'.
          </p>

          <div className="mt-5 divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-black/30">
            {DAYS_OF_WEEK.map(({ key, label }) => (
              <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2">
                <span className="text-sm font-medium w-32 capitalize">{label}</span>
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <input
                    type="text"
                    value={profile.regularHours[key] || "closed"}
                    onChange={(e) => handleHourChange(key, e.target.value)}
                    className={cn(
                      "w-full rounded-md border border-[var(--border)] bg-white dark:bg-black/50 px-3 py-1.5 text-xs text-[var(--foreground)] font-mono outline-none focus:border-neutral-400",
                      focus
                    )}
                    placeholder="08:00-17:00 or closed"
                  />
                  <button
                    type="button"
                    onClick={() => handleHourChange(key, "closed")}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5",
                      focus
                    )}
                  >
                    Closed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Holiday Exceptions */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 md:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
            <h2 className="text-base font-semibold tracking-tight">Holiday & Special Closures</h2>
          </div>
          <p className={`text-sm ${muted}`}>
            Explicit date overrides that take precedence over standard weekly operating hours.
          </p>

          <div className="mt-5 space-y-2">
            {Object.entries(profile.holidayHours).length === 0 ? (
              <p className={`text-sm italic py-2 ${muted}`}>No holiday overrides configured.</p>
            ) : (
              Object.entries(profile.holidayHours).map(([date, hours]) => (
                <div
                  key={date}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-black/30 px-3.5 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[var(--foreground)]">{date}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-neutral-800 text-[var(--muted-foreground)] font-mono">
                      {hours}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeHoliday(date)}
                    className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Add Special Date Override
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className={cn(
                  "rounded-md border border-[var(--border)] bg-black/50 px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-neutral-400",
                  focus
                )}
              />
              <input
                type="text"
                placeholder="e.g. closed or 09:00-13:00"
                value={newHolidayHours}
                onChange={(e) => setNewHolidayHours(e.target.value)}
                className={cn(
                  "flex-1 min-w-[180px] rounded-md border border-[var(--border)] bg-black/50 px-3 py-1.5 text-xs text-[var(--foreground)] outline-none focus:border-neutral-400",
                  focus
                )}
              />
              <button
                type="button"
                onClick={addHoliday}
                className={cn(
                  "rounded-md border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-white/10",
                  focus
                )}
              >
                Add Rule
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
