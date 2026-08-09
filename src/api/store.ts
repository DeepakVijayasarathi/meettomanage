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
