import { apiFetch } from "@/lib/api";

/** How a non-teacher staff member's pay is worked out — teachers have their own batch-wise/per-minute payout (see api/payouts.ts). */
export type CompensationBasis = "FixedMonthly" | "PercentOfMonthlyCollection";

export type StaffPayoutStatus = "Finalized" | "Paid";

export interface ApiStaffCompensationSetting {
  userId: string;
  basis: CompensationBasis;
  fixedMonthlyAmount: number | null;
  collectionPercentage: number | null;
  /** "YYYY-MM-DD" — takes effect from this date onward; months before it keep whatever was in force at the time. */
  effectiveFrom: string;
  updatedAtUtc: string | null;
}

/** A Coordinator/Relationship Manager/Admission/Admin account Admin or Management can set compensation for. */
export interface ApiEligibleStaff {
  userId: string;
  name: string;
  email: string;
  role: "Admin" | "SubAdmin" | "AdmissionTeam" | "Teacher" | "Parent";
  /** The Sub Admin's assigned preset (e.g. "Coordinator", "Parent Relationship Manager") — null for Admin/Admission. */
  roleName: string | null;
  compensation: ApiStaffCompensationSetting | null;
}

/** One month's pay for a non-teacher staff member — live (current month) or a frozen past-month snapshot. */
export interface ApiStaffPayout {
  /** Null for the live current month, which has no row yet. */
  id: string | null;
  userId: string;
  staffName: string | null;
  periodYear: number;
  periodMonth: number;
  basis: CompensationBasis;
  amount: number;
  collectionAmountRaw: number | null;
  collectionAmountRounded: number | null;
  appliedPercentage: number | null;
  appliedFixedAmount: number | null;
  /** False for the live current month — nothing saved yet, so nothing to mark paid. */
  isFinalized: boolean;
  status: StaffPayoutStatus | null;
  paidAtUtc: string | null;
}

export interface ApiStaffEarnings {
  currentMonth: ApiStaffPayout;
  history: ApiStaffPayout[];
}

export async function listEligibleStaff(): Promise<ApiEligibleStaff[]> {
  return apiFetch<ApiEligibleStaff[]>("/api/staff-payouts/eligible-staff");
}

export async function setStaffCompensation(
  userId: string,
  input: { basis: CompensationBasis; fixedMonthlyAmount?: number; collectionPercentage?: number; effectiveFrom?: string }
): Promise<ApiStaffCompensationSetting> {
  return apiFetch<ApiStaffCompensationSetting>(`/api/staff-payouts/compensation/${userId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

/** The signed-in staff member's own current month plus every past month on record. */
export async function getMyStaffEarnings(): Promise<ApiStaffEarnings> {
  return apiFetch<ApiStaffEarnings>("/api/staff-payouts/mine");
}

/** Admin/Management oversight: any one staff member's earnings. */
export async function getStaffEarningsForUser(userId: string): Promise<ApiStaffEarnings> {
  return apiFetch<ApiStaffEarnings>(`/api/staff-payouts/${userId}`);
}

export async function markStaffPayoutPaid(id: string): Promise<ApiStaffPayout> {
  return apiFetch<ApiStaffPayout>(`/api/staff-payouts/${id}/mark-paid`, { method: "POST" });
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatStaffPayoutPeriod(periodYear: number, periodMonth: number): string {
  return `${MONTH_NAMES[periodMonth - 1]} ${periodYear}`;
}
