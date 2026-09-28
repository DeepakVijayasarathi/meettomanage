import { apiFetch } from "@/lib/api";
import type { TeacherPayout } from "@/types";

export type ApiPayoutStatus = "Pending" | "Finalized" | "Paid";

export type ApiPayoutItemType =
  | "SessionEarning"
  | "StudentNoShowWaiting"
  | "TeacherNoShowDeduction"
  | "Penalty"
  | "Bonus"
  | "Adjustment";

export interface ApiPayoutItem {
  id: string;
  classSessionId: string | null;
  /** The batch this item's class belongs to -- null for items with no classSessionId. */
  className: string | null;
  /** The class's own scheduled start, not when this payout item was created. */
  sessionDate: string | null;
  type: ApiPayoutItemType;
  amount: number;
  note: string | null;
  createdAtUtc: string;
  /** Teacher's captured attendance fell well short of the scheduled class -- needs a human look before this payout is finalized. */
  requiresReview: boolean;
}

export interface ApiPayout {
  id: string;
  teacherProfileId: string;
  teacherName: string;
  periodYear: number;
  periodMonth: number;
  status: ApiPayoutStatus;
  totalAmount: number;
  finalizedAtUtc: string | null;
  emailSentAtUtc: string | null;
  items: ApiPayoutItem[];
}

export interface ApiPayoutRate {
  id: string;
  /** Null identifies the centre-wide default rate card. */
  teacherProfileId: string | null;
  teacherName: string;
  /** Rate applied per minute of a session's own scheduled duration. */
  ratePerMinute: number;
  /** Teacher no-show deduction as % of the session rate (100 = full rate). */
  teacherNoShowPenaltyPercent: number;
  effectiveFrom: string;
  isActive: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Shared by toFrontendPayout below and anywhere else a bare periodYear/periodMonth pair
 *  (rather than a full ApiPayout) needs the same "August 2026" label — e.g. the Management
 *  Teacher Snapshot report's payout summary, which only ever gets year/month + status +
 *  total, never a full itemized payout to build one from. */
export function formatPayoutPeriod(periodYear: number, periodMonth: number): string {
  return `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`;
}

export function toFrontendPayout(payout: ApiPayout): TeacherPayout {
  const earnings = payout.items.filter((i) => i.type === "SessionEarning");
  const waiting = payout.items
    .filter((i) => i.type === "StudentNoShowWaiting")
    .reduce((sum, i) => sum + i.amount, 0);
  const deductions = payout.items
    .filter((i) => i.amount < 0)
    .reduce((sum, i) => sum + Math.abs(i.amount), 0);

  return {
    id: payout.id,
    teacherId: payout.teacherProfileId,
    teacherName: payout.teacherName,
    month: formatPayoutPeriod(payout.periodYear, payout.periodMonth),
    sessionsCompleted: earnings.length,
    baseAmount: earnings.reduce((sum, i) => sum + i.amount, 0),
    deductions,
    waitingAmountAdded: waiting,
    finalAmount: payout.totalAmount,
    // Was collapsing Pending and Finalized into the same "calculated" label — the one
    // distinction that actually matters for the finalize/mark-paid workflow below,
    // since a Pending payout can still change (more sessions may complete this month)
    // while a Finalized one is locked and just waiting to be paid.
    status: payout.status === "Paid" ? "paid" : payout.status === "Finalized" ? "finalized" : "pending",
    requiresReview: payout.items.some((i) => i.requiresReview),
    items: payout.items.map((i) => ({
      id: i.id,
      classSessionId: i.classSessionId,
      className: i.className,
      sessionDate: i.sessionDate,
      type: i.type,
      amount: i.amount,
      note: i.note,
      createdAtUtc: i.createdAtUtc,
      requiresReview: i.requiresReview,
    })),
  };
}

export async function listPayouts(filter?: {
  year?: number;
  month?: number;
  teacherProfileId?: string;
}): Promise<ApiPayout[]> {
  const params = new URLSearchParams();
  if (filter?.year) params.set("year", String(filter.year));
  if (filter?.month) params.set("month", String(filter.month));
  if (filter?.teacherProfileId) params.set("teacherProfileId", filter.teacherProfileId);
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<ApiPayout[]>(`/api/payouts${query}`);
}

/** The signed-in teacher's own payout history. */
export async function listMyPayouts(): Promise<ApiPayout[]> {
  return apiFetch<ApiPayout[]>("/api/payouts/mine");
}

/** One batch's row on "My Earnings" for a month. */
export interface ApiTeacherBatchEarnings {
  /** Null for a demo/ad-hoc session with no batch behind it. */
  batchId: string | null;
  batchName: string;
  /** The batch's flat per-class rate if it has one; otherwise the effective average for a per-minute-rate batch. */
  ratePerClass: number | null;
  classesTaken: number;
  totalEarned: number;
}

/** "My Earnings" (client requirement): a teacher's classes-taken and earnings per batch for one month. */
export interface ApiTeacherEarningsSummary {
  periodYear: number;
  periodMonth: number;
  status: ApiPayoutStatus | null;
  totalAmount: number;
  batches: ApiTeacherBatchEarnings[];
}

/** Batch-wise breakdown for one month, defaulting to the current month. */
export async function getMyEarningsSummary(year?: number, month?: number): Promise<ApiTeacherEarningsSummary> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const query = params.size > 0 ? `?${params}` : "";
  return apiFetch<ApiTeacherEarningsSummary>(`/api/payouts/mine/summary${query}`);
}

export async function finalizePayout(id: string): Promise<ApiPayout> {
  return apiFetch<ApiPayout>(`/api/payouts/${id}/finalize`, { method: "POST" });
}

export async function markPayoutPaid(id: string): Promise<ApiPayout> {
  return apiFetch<ApiPayout>(`/api/payouts/${id}/mark-paid`, { method: "POST" });
}

/** Corrects (or confirms as-is) one flagged line item — only while its payout is still Pending. Clears the review flag either way. */
export async function adjustPayoutItem(
  payoutId: string,
  itemId: string,
  input: { newAmount: number; reason: string }
): Promise<ApiPayout> {
  return apiFetch<ApiPayout>(`/api/payouts/${payoutId}/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function listPayoutRates(teacherProfileId?: string): Promise<ApiPayoutRate[]> {
  const query = teacherProfileId ? `?teacherProfileId=${teacherProfileId}` : "";
  return apiFetch<ApiPayoutRate[]>(`/api/payout-rates${query}`);
}

export async function savePayoutRate(input: {
  /** Omit to save the centre-wide default rate card (pays teachers without their own rates). */
  teacherProfileId?: string;
  /** Rate applied per minute of a session's own scheduled duration. */
  ratePerMinute: number;
  /** No-show deduction as % of the session rate; omitted = 100 (full rate). */
  teacherNoShowPenaltyPercent?: number;
  effectiveFrom: string;
}): Promise<ApiPayoutRate> {
  return apiFetch<ApiPayoutRate>("/api/payout-rates", { method: "POST", body: JSON.stringify(input) });
}

// --- Payout Approvals (short classes) ---

export type PayoutReviewDecision = "ApprovedFull" | "ApprovedPartial" | "Rejected";

/** A class that ran shorter than scheduled (or had no teacher attendance) — one row on Payout Approvals. */
export interface ApiPayoutApproval {
  itemId: string;
  payoutId: string;
  payoutStatus: ApiPayoutStatus;
  classSessionId: string | null;
  teacherName: string;
  className: string;
  studentNames: string | null;
  scheduledStartAtUtc: string | null;
  scheduledEndAtUtc: string | null;
  actualStartAtUtc: string | null;
  actualEndAtUtc: string | null;
  scheduledMinutes: number | null;
  /** Null when no teacher attendance was recorded at all. */
  deliveredMinutes: number | null;
  shortfallMinutes: number | null;
  fullAmount: number;
  /** Full amount pro-rated to the delivered minutes — the suggested partial payout. */
  proRatedAmount: number;
  amount: number;
  pending: boolean;
  decision: PayoutReviewDecision | null;
  reviewedByName: string | null;
  reviewedAtUtc: string | null;
  note: string | null;
  createdAtUtc: string;
}

export async function listPayoutApprovals(pending: boolean): Promise<ApiPayoutApproval[]> {
  return apiFetch<ApiPayoutApproval[]>(`/api/payouts/approvals?pending=${pending}`);
}

export async function decidePayoutApproval(
  itemId: string,
  input: { decision: PayoutReviewDecision; amount?: number; note?: string },
): Promise<ApiPayoutApproval> {
  return apiFetch<ApiPayoutApproval>(`/api/payouts/approvals/${itemId}/decide`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
