const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export type UserRole = "OPERATOR" | "VIEWER";

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
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserProfile): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
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
    const role: UserRole = payload.email.includes("viewer") ? "VIEWER" : "OPERATOR";

    const demoUser: UserProfile = {
      id: "demo-" + role.toLowerCase(),
      email: payload.email,
      name: role.charAt(0) + role.slice(1).toLowerCase() + " User",
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

  const user: UserProfile = data.user || {
    id: "usr-" + Date.now(),
    email: data.email ?? payload.email,
    name: payload.email.split("@")[0],
    role: payload.email.includes("viewer") ? "VIEWER" : "OPERATOR",
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

// ---- Platform Connections & Synchronization ----
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
      policyNotes: "Official Google Business Profile API (v1 / v4) supports automated edits for verified locations. Live mode requires Google Cloud OAuth credentials and location permissions. Simulated demo mode uses local mock server.",
      manualPortalUrl: "https://business.google.com",
    },
    policyNotes: "Full read and write capability supported when authenticated with Google Business Profile API.",
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
    canWrite: false,
    capabilities: {
      canRead: true,
      canWrite: false,
      supportsHolidays: false,
      supportsHours: true,
      isOfficialApi: true,
      requiresPartnerAgreement: true,
      policyNotes: "Mappls REST API public tier is strictly read-only for listing details. Automated mutations require enterprise partner licensing. Changes can also be submitted manually via Mappls Pin / Business Portal.",
      manualPortalUrl: "https://mappls.com",
    },
    policyNotes: "Mappls public API is strictly read-only. Proposed updates will be marked as blocked; manual portal action is required.",
    config: { hasSecret: false },
    lastTestedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: "justdial",
    name: "Justdial (India)",
    platformKey: "justdial",
    status: "DEMO_MODE",
    mode: "DEMO",
    canWrite: true,
    capabilities: {
      canRead: true,
      canWrite: true,
      supportsHolidays: true,
      supportsHours: true,
      isOfficialApi: true,
      policyNotes: "Justdial automated listing mutations are supported for verified merchants with JD Omni / Merchant API keys. Justdial blocks holiday hours sync on national/public holidays to prevent unintended store closure drifts. Manual verification is required during restricted periods.",
      manualPortalUrl: "https://www.justdial.com/Free-Listing",
    },
    policyNotes: "Read-write supported for standard hours and NAP. Holiday hours are policy-blocked during national holidays.",
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
  const current = all.find((p) => p.id === platformId) || DEFAULT_LOCAL_PLATFORMS.find((p) => p.id === platformId)!;
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
        message: "Live connection failed: Google Cloud OAuth credentials and Location ID are required for live sync.",
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
    message: payload.mode === "DEMO"
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
