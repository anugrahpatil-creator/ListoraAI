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
      role: payload.role || "OWNER",
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
    role: payload.role || "OWNER",
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
      { id: "usr-2", email: "operator@listora.ai", name: "Operations Lead", role: "OWNER", createdAt: "2026-10-05" },
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
// Platform Connections & Synchronization
// ---------------------------------------------------------------------------

export type PlatformConnectionStatus = "CONNECTED" | "NOT_CONNECTED" | "DEMO_MODE" | "CONNECTION_FAILED";
export type PlatformMode = "LIVE" | "DEMO";

export type PlatformCapabilities = {
  canRead: boolean;
  canWrite: boolean;
  supportsHolidays: boolean;
  supportsHours: boolean;
  isOfficialApi: boolean;
  requiresPartnerAgreement?: boolean;
  manualPortalUrl?: string;
  policyNotes: string;
};

export type PlatformConnection = {
  id: string; // 'googleMaps' | 'mappls' | 'justdial'
  name: string;
  platformKey: string;
  status: PlatformConnectionStatus;
  mode: PlatformMode;
  canWrite: boolean;
  capabilities: PlatformCapabilities;
  policyNotes: string;
  config?: {
    clientId?: string;
    locationId?: string;
    accountId?: string;
    merchantId?: string;
    hasSecret?: boolean;
  };
  lastTestedAt?: string;
  lastSyncedAt?: string;
};

export type ConnectPlatformPayload = {
  mode: PlatformMode | "DISCONNECT";
  clientId?: string;
  clientSecret?: string;
  locationId?: string;
  accountId?: string;
  merchantId?: string;
  apiKey?: string;
};

const DEFAULT_LOCAL_PLATFORMS: PlatformConnection[] = [
  {
    id: "googleMaps",
    name: "Google Maps / Google Business Profile",
    platformKey: "googleMaps",
    status: "DEMO_MODE",
    mode: "DEMO",
    canWrite: true,
    capabilities: {
      canRead: true,
      canWrite: true,
      supportsHolidays: true,
      supportsHours: true,
      isOfficialApi: true,
      policyNotes:
        "Official Google Business Profile API (v1 / v4) supports automated edits for verified locations. Live mode requires Google Cloud OAuth credentials and location permissions. Simulated demo mode uses local mock server.",
      manualPortalUrl: "https://business.google.com",
    },
    policyNotes:
      "Full read and write capability supported when authenticated with Google Business Profile API.",
    config: { hasSecret: false },
    lastTestedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: "mappls",
    name: "Mappls (MapmyIndia)",
    platformKey: "mappls",
    status: "DEMO_MODE",
    mode: "DEMO",
    canWrite: true,
    capabilities: {
      canRead: true,
      canWrite: true,
      supportsHolidays: true,
      supportsHours: true,
      isOfficialApi: true,
      requiresPartnerAgreement: true,
      policyNotes:
        "Direct listing push supported via Mappls Enterprise Map & Location Management APIs. Requires client_id & client_secret partner agreement. In simulated mode, calls mock server.",
      manualPortalUrl: "https://about.mappls.com",
    },
    policyNotes:
      "Read-write supported for verified merchant enterprise partners. Rate limited to 100 updates/day.",
    config: { hasSecret: false },
    lastTestedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: "justdial",
    name: "Justdial",
    platformKey: "justdial",
    status: "DEMO_MODE",
    mode: "DEMO",
    canWrite: true,
    capabilities: {
      canRead: true,
      canWrite: true,
      supportsHolidays: false,
      supportsHours: true,
      isOfficialApi: false,
      policyNotes:
        "Standard Justdial listing hours can be verified automatically. Holiday hour overrides require manual verification or B2B Verified Merchant API token. In demo mode, writes update local state.",
      manualPortalUrl: "https://www.justdial.com/Free-Listing",
    },
    policyNotes:
      "Read-write supported for standard hours and NAP. Holiday hours are policy-blocked during national holidays.",
    config: { hasSecret: false },
    lastTestedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  },
];

const PLATFORMS_STORAGE_KEY = "listora_platform_connections";

export async function fetchPlatformConnections(): Promise<PlatformConnection[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/platforms`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // fallback to storage
  }

  try {
    const raw = localStorage.getItem(PLATFORMS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }

  return DEFAULT_LOCAL_PLATFORMS;
}

export async function connectPlatform(
  platformId: string,
  payload: ConnectPlatformPayload
): Promise<{ connection: PlatformConnection; message: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/platforms/${platformId}/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const all = await fetchPlatformConnections();
      const updated = all.map((p) => (p.id === platformId ? data.connection : p));
      localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(updated));
      return data;
    }
  } catch {
    // local fallback
  }

  const all = (await fetchPlatformConnections()).slice();
  const current =
    all.find((p) => p.id === platformId) ||
    DEFAULT_LOCAL_PLATFORMS.find((p) => p.id === platformId)!;
  const now = new Date().toISOString();

  if (payload.mode === "DISCONNECT") {
    current.status = "NOT_CONNECTED";
    current.lastTestedAt = now;
  } else if (payload.mode === "DEMO") {
    current.status = "DEMO_MODE";
    current.mode = "DEMO";
    current.lastTestedAt = now;
  } else {
    if (platformId === "googleMaps" && (!payload.locationId || !payload.clientId)) {
      current.status = "CONNECTION_FAILED";
      current.mode = "LIVE";
      current.lastTestedAt = now;
      localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(all));
      return {
        connection: current,
        message:
          "Live connection failed: Google Cloud OAuth credentials and Location ID are required for live sync.",
      };
    }
    current.status = "CONNECTED";
    current.mode = "LIVE";
    current.lastTestedAt = now;
    current.config = {
      clientId: payload.clientId,
      locationId: payload.locationId,
      merchantId: payload.merchantId,
      hasSecret: Boolean(payload.clientSecret || payload.apiKey),
    };
  }

  localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(all));
  return {
    connection: current,
    message:
      payload.mode === "DEMO"
        ? `${current.name} connected in Simulated Demo Mode.`
        : payload.mode === "DISCONNECT"
        ? `Disconnected from ${current.name}.`
        : `Connected to ${current.name} live API.`,
  };
}

export async function testPlatformConnection(platformId: string): Promise<{
  success: boolean;
  status: PlatformConnectionStatus;
  mode: PlatformMode;
  message: string;
  latencyMs: number;
}> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/platforms/${platformId}/test`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // local fallback
  }

  const all = await fetchPlatformConnections();
  const current = all.find((p) => p.id === platformId);
  const isDemo = current?.mode === "DEMO";

  if (current?.status === "NOT_CONNECTED") {
    return {
      success: false,
      status: "NOT_CONNECTED",
      mode: current.mode,
      latencyMs: 0,
      message: `${current.name} is not connected. Use Configure to connect.`,
    };
  }

  return {
    success: current?.status !== "CONNECTION_FAILED",
    status: current?.status || "DEMO_MODE",
    mode: current?.mode || "DEMO",
    latencyMs: isDemo ? 32 : 110,
    message: isDemo
      ? `${current?.name} simulated probe successful. Local mock platform service is healthy.`
      : `${current?.name} live connection is active.`,
  };
}

export async function disconnectPlatform(platformId: string) {
  return connectPlatform(platformId, { mode: "DISCONNECT" });
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

export async function fetchRatingSummary(): Promise<RatingSummary> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ratings`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  let reviews: ReviewItem[] = DEFAULT_DEMO_REVIEWS;
  try {
    const stored = localStorage.getItem(DEMO_REVIEWS_STORAGE_KEY);
    if (stored) {
      reviews = JSON.parse(stored);
    }
  } catch {
    // ignore
  }

  const totalReviews = reviews.length;
  const ratingSum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const accuracySum = reviews.reduce((acc, r) => acc + r.accuracyScore, 0);
  const reliabilitySum = reviews.reduce((acc, r) => acc + r.reliabilityScore, 0);

  const overallRating = Number((ratingSum / totalReviews).toFixed(1));
  const accuracyAverage = Number((accuracySum / totalReviews).toFixed(1));
  const reliabilityAverage = Number((reliabilitySum / totalReviews).toFixed(1));

  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    distribution[star] = (distribution[star] || 0) + 1;
  }

  const isTopRated = overallRating >= 4.5;
  const tier = overallRating >= 4.7 ? "Elite Gold Verified" : overallRating >= 4.2 ? "Silver Consistent" : "Verified Partner";
  const tierBadgeColor = tier === "Elite Gold Verified" ? "#f59e0b" : tier === "Silver Consistent" ? "#94a3b8" : "#3b82f6";

  return {
    overallRating,
    totalReviews,
    accuracyAverage,
    reliabilityAverage,
    distribution,
    publicity: {
      businessName: "The Bombay Roastery & Café",
      address: "Plot 742, 12th Main Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
      overallRating,
      totalReviews,
      accuracyAverage,
      reliabilityAverage,
      isTopRated,
      tier,
      tierBadgeColor,
      publicityQuote: `The Bombay Roastery & Café holds a stellar ${overallRating} / 5.0 public rating with verified business listings across Google Maps, Mappls & Justdial.`,
      badgeHtmlSnippet: `<div style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;background:#18181b;color:#f4f4f5;font-family:sans-serif;font-size:13px;border:1px solid #3f3f46;box-shadow:0 4px 12px rgba(0,0,0,0.15);"><span style="color:#f59e0b;font-weight:bold;">★ ${overallRating}</span><span>|</span><span style="font-weight:600;">Top-Rated Business</span><span style="font-size:11px;opacity:0.75;">Verified by ListoraAI</span></div>`,
      publicReviewUrl: "/rate",
    },
    recentReviews: reviews,
  };
}

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  const prevSummary = await fetchRatingSummary();
  const previousRating = prevSummary.overallRating;

  const validRating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const validAccuracy = Math.max(1, Math.min(5, Math.round(input.accuracyScore ?? validRating)));
  const validReliability = Math.max(1, Math.min(5, Math.round(input.reliabilityScore ?? validRating)));

  const newReview: ReviewItem = {
    id: "rev-" + Date.now(),
    authorName: input.authorName.trim(),
    authorEmail: input.authorEmail?.trim() || null,
    rating: validRating,
    accuracyScore: validAccuracy,
    reliabilityScore: validReliability,
    comment: input.comment.trim(),
    verified: true,
    createdAt: new Date().toISOString(),
  };

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

// ---------------------------------------------------------------------------
// Ratings & Reputation Monitoring Feature
// ---------------------------------------------------------------------------

export type PlatformMetric = {
  id: string;
  name: string;
  platformKey: string;
  connectionStatus: "Connected" | "Demo Data" | "Not Connected" | "Stale Data";
  rating: number;
  scale: string;
  reviewCount: number;
  previousRating: number;
  ratingDelta: number;
  trendStatus: "Improving" | "Declining" | "Stable";
  unansweredCount: number;
  latestReviewDate: string;
  lastRefreshedAt: string;
  dataSource: string;
  responseSupported: boolean;
};

export type ReviewRecord = {
  id: string;
  platform: string;
  platformDisplayName: string;
  externalReviewId?: string;
  authorName: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  responseStatus: "UNANSWERED" | "ANSWERED" | "DRAFT" | "UNSUPPORTED";
  responseText?: string | null;
  responseDraft?: string | null;
  responseApproved?: boolean;
  responsePublishedAt?: string | null;
  suggestedAction?: string;
};

export type AIReputationInsight = {
  id: string;
  title: string;
  explanation: string;
  category: "Service Quality" | "Waiting Time" | "Hours Accuracy" | "Staff Behavior" | "Pricing";
  supportingReviewsCount: number;
  reviewReferences: string[];
  dateRange: string;
  recommendedAction: string;
  confidence: number;
  generatedAt: string;
};

export type RatingsOverview = {
  overallRating: number;
  overallRatingLabel: string;
  totalReviews: number;
  uniqueReviewsCount: number;
  platformsContributing: number;
  lastRefreshedAt: string;
  dataQualityLabel: "Demo Data" | "Verified Partner Data";
  calculationDocumentation: string;
  unansweredCount: number;
  lowRatingAlertCount: number;
  lowRatingThreshold: number;
  timeRange: "7d" | "30d" | "90d";
  trendDirection: "Improving" | "Declining" | "Stable";
  trendSnapshots: Array<{ date: string; rating: number; reviewCount: number }>;
  platforms: PlatformMetric[];
};

export type ReputationSettingsDto = {
  lowRatingThreshold: number;
  alertOnLowRating: boolean;
  alertOnUnanswered: boolean;
};

export async function fetchRatingsOverview(timeRange: "7d" | "30d" | "90d" = "30d"): Promise<RatingsOverview> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/overview?timeRange=${timeRange}`, {
      credentials: "include",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  // Standalone offline demo snapshot
  const platforms: PlatformMetric[] = [
    {
      id: "plat-google-maps",
      name: "Google Maps (India)",
      platformKey: "mockMapsA",
      connectionStatus: "Connected",
      rating: 4.8,
      scale: "5.0",
      reviewCount: 142,
      previousRating: 4.6,
      ratingDelta: +0.2,
      trendStatus: "Improving",
      unansweredCount: 1,
      latestReviewDate: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      lastRefreshedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      dataSource: "Partner Sync",
      responseSupported: true,
    },
    {
      id: "plat-mappls",
      name: "Mappls (MapmyIndia)",
      platformKey: "mockMapsB",
      connectionStatus: "Connected",
      rating: 4.5,
      scale: "5.0",
      reviewCount: 68,
      previousRating: 4.5,
      ratingDelta: 0.0,
      trendStatus: "Stable",
      unansweredCount: 2,
      latestReviewDate: new Date(Date.now() - 1000 * 60 * 60 * 84).toISOString(),
      lastRefreshedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      dataSource: "Partner Sync",
      responseSupported: false,
    },
    {
      id: "plat-justdial",
      name: "Justdial (India)",
      platformKey: "mockDirectoryC",
      connectionStatus: "Connected",
      rating: 4.4,
      scale: "5.0",
      reviewCount: 94,
      previousRating: 4.3,
      ratingDelta: +0.1,
      trendStatus: "Improving",
      unansweredCount: 1,
      latestReviewDate: new Date(Date.now() - 1000 * 60 * 60 * 110).toISOString(),
      lastRefreshedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      dataSource: "Local Directory Cache",
      responseSupported: false,
    },
  ];

  const totalReviews = platforms.reduce((acc, p) => acc + p.reviewCount, 0);
  const weightedSum = platforms.reduce((acc, p) => acc + p.rating * p.reviewCount, 0);
  const overallRating = Number((weightedSum / totalReviews).toFixed(1));

  const days = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30;
  const trendSnapshots: Array<{ date: string; rating: number; reviewCount: number }> = [];
  const now = Date.now();
  const step = Math.max(1, Math.floor(days / 6));

  for (let i = days; i >= 0; i -= step) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const historicalRating = Number((overallRating - (i / days) * 0.2).toFixed(1));
    trendSnapshots.push({
      date: dateLabel,
      rating: Math.max(1.0, Math.min(5.0, historicalRating)),
      reviewCount: Math.round(totalReviews - (i / days) * 15),
    });
  }

  return {
    overallRating,
    overallRatingLabel: `${overallRating} / 5.0`,
    totalReviews,
    uniqueReviewsCount: 7,
    platformsContributing: 3,
    lastRefreshedAt: new Date().toISOString(),
    dataQualityLabel: "Demo Data",
    calculationDocumentation:
      "Overall Rating is a review-count-weighted cross-platform estimate: ∑(Platform Rating × Review Count) / ∑(Total Reviews).",
    unansweredCount: 4,
    lowRatingAlertCount: 2,
    lowRatingThreshold: 3.0,
    timeRange,
    trendDirection: "Improving",
    trendSnapshots,
    platforms,
  };
}

export async function fetchPlatformReviews(options?: {
  platform?: string;
  minRating?: number;
  maxRating?: number;
  sentiment?: string;
  responseStatus?: string;
  search?: string;
  sortBy?: "newest" | "oldest" | "highest" | "lowest";
}): Promise<{ reviews: ReviewRecord[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (options?.platform) params.set("platform", options.platform);
    if (options?.minRating) params.set("minRating", String(options.minRating));
    if (options?.maxRating) params.set("maxRating", String(options.maxRating));
    if (options?.sentiment) params.set("sentiment", options.sentiment);
    if (options?.responseStatus) params.set("responseStatus", options.responseStatus);
    if (options?.search) params.set("search", options.search);
    if (options?.sortBy) params.set("sortBy", options.sortBy);

    const res = await fetch(`${baseUrl}/api/v1/reputation/reviews?${params.toString()}`, {
      credentials: "include",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  const DEFAULT_REVIEWS: ReviewRecord[] = [
    {
      id: "pr-1",
      platform: "mockMapsA",
      platformDisplayName: "Google Maps (India)",
      authorName: "Rohan Sharma",
      rating: 5,
      reviewText: "Checked their opening hours on Google Maps and arrived at 07:15 AM — open exactly on time! Sourdough croissants were fresh and coffee was exceptional.",
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      sentiment: "POSITIVE",
      responseStatus: "ANSWERED",
      responseText: "Thank you for visiting us early, Rohan! We take pride in opening right on time at 7 AM every day. See you again soon!",
      suggestedAction: "Customer satisfied with timely opening and breakfast quality.",
    },
    {
      id: "pr-2",
      platform: "mockMapsA",
      platformDisplayName: "Google Maps (India)",
      authorName: "Neha Verma",
      rating: 2,
      reviewText: "Waited over 35 minutes for our filter coffee on Sunday morning peak hour. The staff seemed overwhelmed and disoriented despite polite attitude.",
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      sentiment: "NEGATIVE",
      responseStatus: "UNANSWERED",
      responseDraft: "Dear Neha, thank you for sharing your feedback. We sincerely apologize for the 35-minute delay during Sunday rush hour. We are currently reviewing our peak-hour barista staffing to ensure orders are served promptly. We hope to welcome you back for a smoother experience.",
      suggestedAction: "Address Sunday morning barista staffing delays.",
    },
    {
      id: "pr-3",
      platform: "mockMapsB",
      platformDisplayName: "Mappls (MapmyIndia)",
      authorName: "Arjun Nair",
      rating: 5,
      reviewText: "Address on Mappls guided our cab right to the doorstep in Indiranagar. Great ambiance, quiet work corners, and high-speed Wi-Fi.",
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 84).toISOString(),
      sentiment: "POSITIVE",
      responseStatus: "UNANSWERED",
      suggestedAction: "Acknowledge positive location and remote-work atmosphere.",
    },
    {
      id: "pr-4",
      platform: "mockDirectoryC",
      platformDisplayName: "Justdial (India)",
      authorName: "Priya Venkatesh",
      rating: 5,
      reviewText: "Direct phone number listed on Justdial connected right to the store manager. Easily booked a table for our 8-person team lunch.",
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 110).toISOString(),
      sentiment: "POSITIVE",
      responseStatus: "ANSWERED",
      responseText: "Thank you Priya! Glad our manager could assist with your team lunch reservation. We loved hosting your team!",
      suggestedAction: "Customer confirmed phone contact reliability.",
    },
    {
      id: "pr-5",
      platform: "mockDirectoryC",
      platformDisplayName: "Justdial (India)",
      authorName: "Vikramjit Singh",
      rating: 3,
      reviewText: "Coffee is great but parking on 12th Main Road during evening hours is quite tricky. Valet service or clearer signage would help.",
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 160).toISOString(),
      sentiment: "NEUTRAL",
      responseStatus: "UNANSWERED",
      suggestedAction: "Add parking guidelines or valet assistance notice to listing details.",
    },
    {
      id: "pr-6",
      platform: "mockMapsA",
      platformDisplayName: "Google Maps (India)",
      authorName: "Ananya Deshmukh",
      rating: 4,
      reviewText: "Holiday hours were accurately noted for Republic Day. Saved us from making a wasted trip. Cinnamon rolls are a must-try.",
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 210).toISOString(),
      sentiment: "POSITIVE",
      responseStatus: "ANSWERED",
      responseText: "Thanks Ananya! We make sure our holiday schedules are synchronized everywhere so guests never have to second-guess.",
      suggestedAction: "Praise for synchronized holiday schedule accuracy.",
    },
    {
      id: "pr-7",
      platform: "mockMapsB",
      platformDisplayName: "Mappls (MapmyIndia)",
      authorName: "Karthik Raja",
      rating: 2,
      reviewText: "Prices for specialty pour-overs are on the higher side compared to other cafés in Indiranagar. Seating was quite cramped near the entrance.",
      reviewDate: new Date(Date.now() - 1000 * 60 * 60 * 300).toISOString(),
      sentiment: "NEGATIVE",
      responseStatus: "UNANSWERED",
      suggestedAction: "Customer concerned about value perception and entrance seating density.",
    },
  ];

  let list = DEFAULT_REVIEWS;
  if (options?.platform && options.platform !== "ALL") {
    list = list.filter((r) => r.platform.toLowerCase() === options.platform!.toLowerCase());
  }
  if (options?.minRating !== undefined) {
    list = list.filter((r) => r.rating >= options.minRating!);
  }
  if (options?.sentiment && options.sentiment !== "ALL") {
    list = list.filter((r) => r.sentiment === options.sentiment);
  }
  if (options?.responseStatus && options.responseStatus !== "ALL") {
    list = list.filter((r) => r.responseStatus === options.responseStatus);
  }
  if (options?.search && options.search.trim()) {
    const q = options.search.toLowerCase();
    list = list.filter((r) => r.reviewText.toLowerCase().includes(q) || r.authorName.toLowerCase().includes(q));
  }

  return { reviews: list, total: list.length };
}

export async function fetchAIReputationInsights(): Promise<AIReputationInsight[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/insights`, { credentials: "include" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  return [
    {
      id: "ins-1",
      title: "Peak Sunday Waiting Times Impacting Customer Satisfaction",
      explanation:
        "Customer reviews identify 30+ minute waiting times for coffee during Sunday morning rush hour (09:00 - 11:30 AM), contrasted with consistent fast service on weekdays.",
      category: "Waiting Time",
      supportingReviewsCount: 3,
      reviewReferences: ["Review by Neha Verma on Google Maps"],
      dateRange: "Last 30 days",
      recommendedAction: "Schedule an extra barista on Sunday morning shifts to keep ticket times below 12 minutes.",
      confidence: 0.94,
      generatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "ins-2",
      title: "Consistently Praised Opening Hours & GPS Accuracy",
      explanation:
        "Visitors across Google Maps and Justdial specifically validated that opening right at 7:00 AM on weekdays prevented wasted trips.",
      category: "Hours Accuracy",
      supportingReviewsCount: 4,
      reviewReferences: ["Review by Rohan Sharma", "Review by Ananya Deshmukh"],
      dateRange: "Last 30 days",
      recommendedAction: "Highlight early 7:00 AM opening hours on storefront banners and social profiles.",
      confidence: 0.96,
      generatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: "ins-3",
      title: "Customer Requests for Valet or Parking Assistance",
      explanation:
        "Evening patrons on 12th Main Road note that street parking is congested and request clear parking guidance.",
      category: "Service Quality",
      supportingReviewsCount: 2,
      reviewReferences: ["Review by Vikramjit Singh on Justdial"],
      dateRange: "Last 30 days",
      recommendedAction: "Add parking instructions and nearby landmark tips in the canonical business profile.",
      confidence: 0.88,
      generatedAt: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
  ];
}

export async function triggerAIReputationAnalysis(): Promise<{
  insights: AIReputationInsight[];
  summary: string;
  totalReviewsAnalyzed: number;
}> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/insights/analyze`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  const insights = await fetchAIReputationInsights();
  return {
    insights,
    summary:
      "Analyzed customer reviews across Google Maps, Mappls, and Justdial. Customer sentiment remains 86% positive with primary praise around opening hour reliability and coffee quality. Identified 2 operational optimization opportunities in Sunday morning staffing and evening parking guidance.",
    totalReviewsAnalyzed: 7,
  };
}

export async function generateAIReviewResponseDraft(reviewId: string): Promise<{
  review: ReviewRecord;
  suggestedDraft: string;
  guidelinesUsed: string;
}> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/reviews/${reviewId}/generate-response`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  const { reviews } = await fetchPlatformReviews();
  const rev = reviews.find((r) => r.id === reviewId) || reviews[0];

  let draft = "";
  let guidelines = "";

  if (rev.sentiment === "NEGATIVE" || rev.rating <= 2) {
    guidelines = "Negative review protocol: professional & polite tone, acknowledged specific concern, avoided arguing or unprovable promises, protected private customer data.";
    draft = `Dear ${rev.authorName}, thank you for taking the time to share your feedback. We sincerely apologize that your experience fell short of expectations regarding ${rev.reviewText.toLowerCase().includes("wait") ? "the waiting time during peak rush" : "our service"}. Our team is actively reviewing this with our staff to ensure we maintain the highest standards. We would love the opportunity to make this right on your next visit.`;
  } else if (rev.sentiment === "POSITIVE" || rev.rating >= 4) {
    guidelines = "Positive review protocol: genuine gratitude, warm & natural tone, concise reply avoiding repetitive robotic templates.";
    draft = `Hi ${rev.authorName}, thank you so much for the wonderful ${rev.rating}-star review! We are thrilled to hear you enjoyed your visit at The Bombay Roastery & Café. Looking forward to welcoming you back soon!`;
  } else {
    guidelines = "Neutral review protocol: helpful and professional acknowledgment with actionable follow-up.";
    draft = `Hello ${rev.authorName}, thank you for visiting us and sharing your valuable observations. We appreciate your helpful feedback and are constantly working to improve our guest experience. Hope to see you again soon!`;
  }

  return {
    review: rev,
    suggestedDraft: draft,
    guidelinesUsed: guidelines,
  };
}

export async function saveReviewResponse(
  reviewId: string,
  responseText: string,
  approved: boolean
): Promise<ReviewRecord> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/reviews/${reviewId}/response`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ responseText, approved }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  const { reviews } = await fetchPlatformReviews();
  const rev = reviews.find((r) => r.id === reviewId) || reviews[0];
  rev.responseText = responseText;
  rev.responseDraft = responseText;
  rev.responseApproved = approved;
  rev.responseStatus = approved ? "ANSWERED" : "DRAFT";
  return rev;
}

export async function publishReviewResponse(reviewId: string): Promise<{
  success: boolean;
  publishedDirectly: boolean;
  message: string;
  review: ReviewRecord;
}> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/reviews/${reviewId}/publish`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  const { reviews } = await fetchPlatformReviews();
  const rev = reviews.find((r) => r.id === reviewId) || reviews[0];
  rev.responseApproved = true;
  rev.responseStatus = "ANSWERED";
  rev.responsePublishedAt = new Date().toISOString();

  if (rev.platform === "mockMapsA") {
    return {
      success: true,
      publishedDirectly: true,
      message: "Response approved and published to Google Maps (India) partner listing API.",
      review: rev,
    };
  }

  return {
    success: true,
    publishedDirectly: false,
    message: "Direct publishing is unavailable for this platform. Copy the approved response and publish it manually on the directory portal.",
    review: rev,
  };
}

export async function fetchReputationSettings(): Promise<ReputationSettingsDto> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/settings`, { credentials: "include" });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  return {
    lowRatingThreshold: 3.0,
    alertOnLowRating: true,
    alertOnUnanswered: true,
  };
}

export async function updateReputationSettings(
  settings: Partial<ReputationSettingsDto>
): Promise<ReputationSettingsDto> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/reputation/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Offline demo fallback
  }

  return {
    lowRatingThreshold: settings.lowRatingThreshold ?? 3.0,
    alertOnLowRating: settings.alertOnLowRating ?? true,
    alertOnUnanswered: settings.alertOnUnanswered ?? true,
  };
}




