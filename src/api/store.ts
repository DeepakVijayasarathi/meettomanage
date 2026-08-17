import { apiFetch } from "@/lib/api";

export interface ApiStorePlan {
  id: string;
  name: string;
  courseName: string | null;
  billingType: "Subscription" | "SessionBased" | "OneTime";
  billingCycle: "Monthly" | "Quarterly" | "Yearly" | "OneTime";
  price: number;
  sessionsIncluded: number | null;
}

export type ApiStoreInquiryStatus = "New" | "Contacted" | "Converted" | "Closed";

export interface ApiStoreInquiry {
  id: string;
  packagePlanId: string;
  planName: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge: number | null;
  notes: string | null;
  status: ApiStoreInquiryStatus;
  createdAtUtc: string;
}

/** Public — no login required. */
export async function listStorePlans(): Promise<ApiStorePlan[]> {
  return apiFetch<ApiStorePlan[]>("/api/store/plans");
}

/** Public — no login required. */
export async function submitStoreInquiry(input: {
  packagePlanId: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge?: number;
  notes?: string;
}): Promise<ApiStoreInquiry> {
  return apiFetch<ApiStoreInquiry>("/api/store/inquiries", { method: "POST", body: JSON.stringify(input) });
}

export interface ApiStoreDemoBookingConfirmation {
  id: string;
  scheduledStartAtUtc: string;
  scheduledEndAtUtc: string;
}

/**
 * Public — no login required. Always auto-assigns a teacher; a visitor never
 * picks who runs the demo. The backend rejects a slot under 2 hours out or
 * more than 30 days away — surface those as the plain validation errors they are.
 */
export async function bookStoreDemo(input: {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge?: number;
  department?: "Phonics" | "Maths";
  /** ISO datetime the visitor picked. */
  preferredStartAtUtc: string;
}): Promise<ApiStoreDemoBookingConfirmation> {
  return apiFetch<ApiStoreDemoBookingConfirmation>("/api/store/demo-bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface ApiAvailableDemoSlot {
  startAtUtc: string;
  endAtUtc: string;
}

/**
 * Public — no login required. Which 30-minute slots on `date` (yyyy-MM-dd, the visitor's
 * own local date) still have a teacher free — lets the booking form offer real openings
 * instead of the visitor guessing a time and hitting "no teacher available".
 */
export async function listDemoAvailability(date: string, department?: "Phonics" | "Maths"): Promise<ApiAvailableDemoSlot[]> {
  const params = new URLSearchParams({ date });
  if (department) params.set("department", department);
  return apiFetch<ApiAvailableDemoSlot[]>(`/api/store/demo-availability?${params.toString()}`);
}

/** Admin — the follow-up queue. */
export async function listStoreInquiries(status?: ApiStoreInquiryStatus): Promise<ApiStoreInquiry[]> {
  const query = status ? `?status=${status}` : "";
  return apiFetch<ApiStoreInquiry[]>(`/api/store/inquiries${query}`);
}

export async function updateStoreInquiryStatus(id: string, status: ApiStoreInquiryStatus): Promise<ApiStoreInquiry> {
  return apiFetch<ApiStoreInquiry>(`/api/store/inquiries/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}
