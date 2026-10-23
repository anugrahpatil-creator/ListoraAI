/**
 * Status constants shared between API, mock platforms, and frontend.
 * These values mirror the Prisma enums in the database layer.
 */

// Verification statuses for listings after an update is applied
export const STATUSES = {
  VERIFIED: 'verified',
  PENDING: 'pending',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;

export type Status = (typeof STATUSES)[keyof typeof STATUSES];

export const VERIFICATION_STATUS = {
  VERIFIED: 'VERIFIED',
  PENDING: 'PENDING',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
} as const;

export const VERIFICATION_STATUSES = STATUSES;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];
export type VerificationStatusValue = (typeof VERIFICATION_STATUSES)[keyof typeof VERIFICATION_STATUSES];

// Classification of a detected mismatch between profile and listing
export const MISMATCH_KIND = {
  MISSING: 'MISSING',
  OUTDATED: 'OUTDATED',
  CONFLICTING: 'CONFLICTING',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  OK: 'OK',
} as const;

export const MISMATCH_KINDS = {
  MISSING: 'missing',
  OUTDATED: 'outdated',
  CONFLICTING: 'conflicting',
  NEEDS_REVIEW: 'needs_review',
  OK: 'ok',
} as const;

export type MismatchKind = (typeof MISMATCH_KIND)[keyof typeof MISMATCH_KIND];
export type MismatchKindValue = (typeof MISMATCH_KINDS)[keyof typeof MISMATCH_KINDS];

// Lifecycle statuses for an owner-approval proposal
export const PROPOSAL_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const PROPOSAL_STATUSES = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ProposalStatus = (typeof PROPOSAL_STATUS)[keyof typeof PROPOSAL_STATUS];
export type ProposalStatusValue = (typeof PROPOSAL_STATUSES)[keyof typeof PROPOSAL_STATUSES];

// Outcomes when the agent attempts to push an update to a mock platform
export const UPDATE_OUTCOME = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
} as const;

export const UPDATE_OUTCOMES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  BLOCKED: 'blocked',
} as const;

export type UpdateOutcome = (typeof UPDATE_OUTCOME)[keyof typeof UPDATE_OUTCOME];
export type UpdateOutcomeValue = (typeof UPDATE_OUTCOMES)[keyof typeof UPDATE_OUTCOMES];

// Multi-user roles (strictly OWNER and VIEWER user-facing roles)
export const USER_ROLES = {
  OWNER: 'OWNER',
  OPERATOR: 'OWNER',
  ADMIN: 'OWNER',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = 'OWNER' | 'VIEWER';

// Platform connection & synchronization statuses
export const PLATFORM_CONNECTION_STATUS = {
  CONNECTED: 'CONNECTED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  DEMO_MODE: 'DEMO_MODE',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
} as const;

export type PlatformConnectionStatus = (typeof PLATFORM_CONNECTION_STATUS)[keyof typeof PLATFORM_CONNECTION_STATUS];

export const PLATFORM_MODE = {
  LIVE: 'LIVE',
  DEMO: 'DEMO',
} as const;

export type PlatformMode = (typeof PLATFORM_MODE)[keyof typeof PLATFORM_MODE];

export const PLATFORM_SYNC_STATUS = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  UPDATING: 'UPDATING',
  VERIFIED: 'VERIFIED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  DEMO_ONLY: 'DEMO_ONLY',
} as const;

export type PlatformSyncStatus = (typeof PLATFORM_SYNC_STATUS)[keyof typeof PLATFORM_SYNC_STATUS];
