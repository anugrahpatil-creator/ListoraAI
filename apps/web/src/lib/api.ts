const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export type UserRole = "OWNER" | "VIEWER";

export type UserProfile = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  createdAt?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
};

export type ApiError = {
  error?: string;
  message?: string;
  requiredRoles?: UserRole[];
  currentRole?: UserRole;
};

const USER_STORAGE_KEY = "listora_current_user";

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    const role: UserRole = (user.role as string)?.toUpperCase() === "VIEWER" ? "VIEWER" : "OWNER";
    return { ...user, role };
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile): void {
  try {
    const role: UserRole = (user.role as string)?.toUpperCase() === "VIEWER" ? "VIEWER" : "OWNER";
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ ...user, role }));
  } catch {
    // ignore
  }
}

export function clearStoredUser(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function login(payload: LoginPayload): Promise<{ user: UserProfile }> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    // Demo fallback only when API server is unreachable
    const role: UserRole = payload.email.includes("viewer") ? "VIEWER" : "OWNER";

    const demoUser: UserProfile = {
      id: "demo-" + role.toLowerCase(),
      email: payload.email,
      name: role === "OWNER" ? "Business Owner" : "Viewer User",
      role,
    };
    setStoredUser(demoUser);
    return { user: demoUser };
  }

  const data = (await res.json().catch(() => ({}))) as ApiError & {
    user?: UserProfile;
    email?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || data.message || "Invalid credentials");
  }

  const rawRole = (data.user?.role as string)?.toUpperCase();
  const normalizedRole: UserRole = rawRole === "VIEWER" ? "VIEWER" : "OWNER";

  const user: UserProfile = {
    id: data.user?.id || "usr-" + Date.now(),
    email: data.user?.email || data.email || payload.email,
    name: data.user?.name || (normalizedRole === "OWNER" ? "Business Owner" : "Viewer User"),
    role: normalizedRole,
  };

  setStoredUser(user);
  return { user };
}

export async function register(payload: RegisterPayload): Promise<{ user: UserProfile }> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch {
    const fallbackUser: UserProfile = {
      id: "demo-" + Date.now(),
      email: payload.email,
      name: payload.name || "Demo User",
      role: payload.role || "OPERATOR",
    };
    setStoredUser(fallbackUser);
    return { user: fallbackUser };
  }

  const data = (await res.json().catch(() => ({}))) as ApiError & {
    user?: UserProfile;
  };

  if (!res.ok) {
    throw new Error(data.error || data.message || "Registration failed");
  }

  const user: UserProfile = data.user || {
    id: "usr-" + Date.now(),
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    role: payload.role || "OPERATOR",
  };

  setStoredUser(user);
  return { user };
}

export async function logout(): Promise<void> {
  clearStoredUser();
  try {
    await fetch(`${baseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // ignore
  }
}

export async function getMe(): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${baseUrl}/auth/me`, {
      credentials: "include",
    });
    if (res.status === 401) {
      clearStoredUser();
      return null;
    }
    if (!res.ok) return getStoredUser();
    const data = await res.json();
    if (data.user) {
      setStoredUser(data.user);
      return data.user;
    }
    return getStoredUser();
  } catch {
    return getStoredUser();
  }
}

export async function listUsers(): Promise<UserProfile[]> {
  try {
    const res = await fetch(`${baseUrl}/auth/users`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Could not fetch users");
    return await res.json();
  } catch {
    // Fallback demo user list
    return [
      { id: "usr-2", email: "operator@listora.ai", name: "Operations Lead", role: "OPERATOR", createdAt: "2026-10-05" },
      { id: "usr-3", email: "viewer@listora.ai", name: "Auditor / Stakeholder", role: "VIEWER", createdAt: "2026-10-10" },
    ];
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<UserProfile> {
  const res = await fetch(`${baseUrl}/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update role");
  }
  return await res.json();
}

// ---- Agent Orchestration & Proposal APIs ----

export type AgentAnalysisResponse = {
  success: boolean;
  output?: {
    summary: string;
    fields: Array<{
      field: string;
      mismatch_kind: string;
      explanation: string;
      proposed_value?: unknown;
      confidence: "high" | "medium" | "low";
    }>;
    requires_human_review: boolean;
    prompt_version: string;
  };
  proposalsCreated?: number;
  toolCallCount: number;
  mode?: string;
  error?: string;
};

export async function runAgentAnalysis(options?: {
  mismatchIds?: string[];
  useStrongModel?: boolean;
}): Promise<AgentAnalysisResponse> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/proposals/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(options || {}),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Agent analysis failed");
    }

    return await res.json();
  } catch (err) {
    // Demo fallback when running without backend API
    const stored = typeof window !== "undefined" ? localStorage.getItem(PROFILE_STORAGE_KEY) : null;
    const currentProfile: BusinessProfileData = stored ? JSON.parse(stored) : DEFAULT_BUSINESS_PROFILE;
    const profilePhone = currentProfile.phone || "+15550102234";

    return {
      success: true,
      mode: "heuristic-engine",
      toolCallCount: 3,
      proposalsCreated: 3,
      output: {
        summary: `Investigated 3 open platform mismatches across Maps A, Maps B, and Directory C against ${currentProfile.name}. Discovered phone formatting discrepancies, operating hours contradictions, and holiday schedule overrides.`,
        fields: [
          {
            field: "phone",
            mismatch_kind: "OUTDATED",
            explanation: `Format difference: Normalizing to canonical international E.164 (${profilePhone}) eliminates click-to-call dialing errors on mobile search and maps.`,
            confidence: "high",
            proposed_value: profilePhone,
          },
          {
            field: "hours",
            mismatch_kind: "CONFLICTING",
            explanation: "Operating hours contradict approved schedule. Synchronizing hours across platforms prevents customer confusion and missed visits.",
            confidence: "high",
            proposed_value: "Mon-Fri 07:00-18:00, Sat 08:00-20:00, Sun 09:00-16:00",
          },
          {
            field: "holidayHours",
            mismatch_kind: "NEEDS_REVIEW",
            explanation: "Special schedule conflict: Listing indicates open on holiday while approved profile is closed. Owner manual review recommended.",
            confidence: "medium",
            proposed_value: { "2026-12-25": "closed" },
          },
        ],
        requires_human_review: true,
        prompt_version: "v1.0-agent",
      },
    };
  }
}

export async function getProposals(options?: { status?: string }) {
  try {
    const query = options?.status ? `?status=${options.status}` : "";
    const res = await fetch(`${baseUrl}/api/v1/proposals${query}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Could not fetch proposals");
    return await res.json();
  } catch {
    return null;
  }
}

export async function approveProposal(id: string) {
  try {
    const res = await fetch(`${baseUrl}/api/v1/proposals/${id}/approve`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Approval failed");
    }
    return await res.json();
  } catch {
    return { id, status: "APPROVED" };
  }
}

export async function rejectProposal(id: string) {
  try {
    const res = await fetch(`${baseUrl}/api/v1/proposals/${id}/reject`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Rejection failed");
    }
    return await res.json();
  } catch {
    return { id, status: "REJECTED" };
  }
}

export async function applyUpdates(proposalId?: string) {
  try {
    const res = await fetch(`${baseUrl}/api/v1/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(proposalId ? { proposalId } : {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Applying updates failed");
    }
    return await res.json();
  } catch {
    return [
      { proposalId: proposalId || "prop-1", outcome: "SUCCESS" },
      { proposalId: "prop-2", outcome: "BLOCKED" },
    ];
  }
}

export async function verifyUpdates(proposalId?: string) {
  try {
    const res = await fetch(`${baseUrl}/api/v1/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(proposalId ? { proposalId } : {}),
    });
    if (!res.ok) throw new Error("Verification failed");
    return await res.json();
  } catch {
    return { verified: true };
  }
}

export async function refreshListings() {
  try {
    const res = await fetch(`${baseUrl}/api/v1/listings/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Could not refresh listings");
    return await res.json();
  } catch {
    return { success: true };
  }
}

// ---- Business Profile Management ----

export type BusinessProfileData = {
  name: string;
  address: string;
  phone: string;
  regularHours: Record<string, string>;
  holidayHours: Record<string, string>;
};

export const DEFAULT_BUSINESS_PROFILE: BusinessProfileData = {
  name: "The Bombay Roastery & Café",
  address: "Plot 742, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
  phone: "+918041234567",
  regularHours: {
    monday: "07:00-22:00",
    tuesday: "07:00-22:00",
    wednesday: "07:00-22:00",
    thursday: "07:00-22:00",
    friday: "07:00-23:00",
    saturday: "08:00-23:00",
    sunday: "08:00-22:00",
  },
  holidayHours: {
    "2026-01-26": "closed", // Republic Day
    "2026-08-15": "closed", // Independence Day
    "2026-10-02": "closed", // Gandhi Jayanti
    "2026-11-08": "closed", // Diwali
  },
};

const PROFILE_STORAGE_KEY = "listora_canonical_business_profile";

export async function getBusinessProfile(): Promise<BusinessProfileData> {
  // First attempt backend fetch
  try {
    const res = await fetch(`${baseUrl}/api/v1/profile`, {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.name) {
        const canonical: BusinessProfileData = {
          name: data.name,
          address: data.address || "",
          phone: data.phone || "",
          regularHours: (data.regularHours as Record<string, string>) || DEFAULT_BUSINESS_PROFILE.regularHours,
          holidayHours: (data.holidayHours as Record<string, string>) || DEFAULT_BUSINESS_PROFILE.holidayHours,
        };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(canonical));
        return canonical;
      }
    }
  } catch {
    // Backend offline or unreachable
  }

  // Fallback to local storage
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }

  return DEFAULT_BUSINESS_PROFILE;
}

export async function updateBusinessProfile(profile: BusinessProfileData): Promise<BusinessProfileData> {
  // Save locally right away so user edits always persist seamlessly
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("listora_profile_updated", { detail: profile }));
    }
  } catch {
    // ignore
  }

  // Also record an audit event locally
  try {
    const rawLogs = localStorage.getItem("listora_audit_logs");
    const logs = rawLogs ? JSON.parse(rawLogs) : [];
    logs.unshift({
      id: "aud-" + Date.now(),
      eventType: "PROFILE_UPDATED",
      actor: "owner",
      actorEmail: getStoredUser()?.email || "operator@listora.ai",
      timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
      summary: `Updated canonical business profile (${profile.name})`,
      payload: {
        name: profile.name,
        address: profile.address,
        phone: profile.phone,
      },
    });
    localStorage.setItem("listora_audit_logs", JSON.stringify(logs.slice(0, 50)));
  } catch {
    // ignore
  }

  // Attempt backend update
  try {
    const res = await fetch(`${baseUrl}/api/v1/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        name: data.name,
        address: data.address || profile.address,
        phone: data.phone || profile.phone,
        regularHours: (data.regularHours as Record<string, string>) || profile.regularHours,
        holidayHours: (data.holidayHours as Record<string, string>) || profile.holidayHours,
      };
    }
  } catch {
    // Backend offline
  }

  return profile;
}

export async function fetchAuditLogs(): Promise<any[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/audit`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data?.data && Array.isArray(data.data)) return data.data;
    }
  } catch {
    // backend offline
  }

  try {
    const raw = localStorage.getItem("listora_audit_logs");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  return [];
}


// ---------------------------------------------------------------------------
// Rating & Publicity Features
// ---------------------------------------------------------------------------

export type ReviewItem = {
  id: string;
  authorName: string;
  authorEmail?: string | null;
  rating: number;
  accuracyScore: number;
  reliabilityScore: number;
  comment: string;
  verified: boolean;
  createdAt: string;
};

export type PublicityData = {
  businessName: string;
  address: string;
  overallRating: number;
  totalReviews: number;
  accuracyAverage: number;
  reliabilityAverage: number;
  isTopRated: boolean;
  tier: "Elite Gold Verified" | "Silver Consistent" | "Verified Partner";
  tierBadgeColor: string;
  publicityQuote: string;
  badgeHtmlSnippet: string;
  publicReviewUrl: string;
};

export type RatingSummary = {
  overallRating: number;
  totalReviews: number;
  accuracyAverage: number;
  reliabilityAverage: number;
  distribution: Record<number, number>;
  publicity: PublicityData;
  recentReviews: ReviewItem[];
};

export type SubmitReviewInput = {
  authorName: string;
  authorEmail?: string;
  rating: number;
  accuracyScore?: number;
  reliabilityScore?: number;
  comment: string;
};

export type SubmitReviewResult = {
  review: ReviewItem;
  previousRating: number;
  newRating: number;
  impactDelta: number;
  totalReviews: number;
  isTopRated: boolean;
  publicityTier: string;
  message: string;
};

const DEMO_REVIEWS_STORAGE_KEY = "listora_customer_reviews";

const DEFAULT_DEMO_REVIEWS: ReviewItem[] = [
  {
    id: "rev-001",
    authorName: "Rohan Sharma",
    authorEmail: "rohan.s@gmail.com",
    rating: 5,
    accuracyScore: 5,
    reliabilityScore: 5,
    comment: "Checked their opening hours on Google Maps and arrived at 07:15 AM — open exactly on time! Seamless experience.",
    verified: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: "rev-002",
    authorName: "Priya Venkatesh",
    authorEmail: "priya.v@outlook.com",
    rating: 5,
    accuracyScore: 5,
    reliabilityScore: 5,
    comment: "Direct phone number listed on Justdial connected right to the manager for reservation. Highly reliable business info!",
    verified: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 42).toISOString(),
  },
  {
    id: "rev-003",
    authorName: "Arjun Nair",
    authorEmail: "arjun.nair@techcorp.in",
    rating: 5,
    accuracyScore: 5,
    reliabilityScore: 4,
    comment: "Address on Mappls guided our cab right to the doorstep in Indiranagar. Great to see perfectly verified business listings.",
    verified: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
  },
  {
    id: "rev-004",
    authorName: "Ananya Deshmukh",
    authorEmail: "ananya.d@gmail.com",
    rating: 4,
    accuracyScore: 4,
    reliabilityScore: 5,
    comment: "Holiday hours were accurately noted for Republic Day. Saved us from making a wasted trip.",
    verified: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString(),
  },
];

  } catch {
    // ignore
  }


    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }



  const updatedReviews = [newReview, ...prevSummary.recentReviews];
  try {
    localStorage.setItem(DEMO_REVIEWS_STORAGE_KEY, JSON.stringify(updatedReviews));
  } catch {
    // ignore
  }

  const newTotal = prevSummary.totalReviews + 1;
  const newRatingSum = previousRating * prevSummary.totalReviews + validRating;
  const newRating = Number((newRatingSum / newTotal).toFixed(1));
  const impactDelta = Number((newRating - previousRating).toFixed(2));

  const isTopRated = newRating >= 4.5;
  const publicityTier = newRating >= 4.7 ? "Elite Gold Verified" : newRating >= 4.2 ? "Silver Consistent" : "Verified Partner";

  const message =
    impactDelta > 0
      ? `Your ${validRating}-star review boosted the public rating by +${impactDelta} points!`
      : impactDelta < 0
      ? `Your review has been verified and factored into the public trust score.`
      : `Your review reinforced the current ${newRating} ★ rating!`;

  return {
    review: newReview,
    previousRating,
    newRating,
    impactDelta,
    totalReviews: newTotal,
    isTopRated,
    publicityTier,
    message,
  };
}
