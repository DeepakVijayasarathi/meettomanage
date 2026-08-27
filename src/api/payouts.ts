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
  /** One flat rate per session, regardless of the class's actual length. */
  ratePerSession: number;
  /** Teacher no-show deduction as % of the session rate (100 = full rate). */
  teacherNoShowPenaltyPercent: number;
  effectiveFrom: string;
  isActive: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
    month: `${MONTH_NAMES[payout.periodMonth - 1]} ${payout.periodYear}`,
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
  /** One flat rate per session, regardless of the class's actual length. */
  ratePerSession: number;
  /** No-show deduction as % of the session rate; omitted = 100 (full rate). */
  teacherNoShowPenaltyPercent?: number;
  effectiveFrom: string;
}): Promise<ApiPayoutRate> {
  return apiFetch<ApiPayoutRate>("/api/payout-rates", { method: "POST", body: JSON.stringify(input) });
}
