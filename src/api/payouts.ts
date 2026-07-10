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
  type: ApiPayoutItemType;
  amount: number;
  note: string | null;
  createdAtUtc: string;
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
  teacherProfileId: string;
  teacherName: string;
  durationMinutes: number;
  ratePerSession: number;
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
    status: payout.status === "Paid" ? "paid" : "calculated",
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

export async function listPayoutRates(teacherProfileId?: string): Promise<ApiPayoutRate[]> {
  const query = teacherProfileId ? `?teacherProfileId=${teacherProfileId}` : "";
  return apiFetch<ApiPayoutRate[]>(`/api/payout-rates${query}`);
}

export async function savePayoutRate(input: {
  teacherProfileId: string;
  durationMinutes: 30 | 45 | 60;
  ratePerSession: number;
  effectiveFrom: string;
}): Promise<ApiPayoutRate> {
  return apiFetch<ApiPayoutRate>("/api/payout-rates", { method: "POST", body: JSON.stringify(input) });
}
