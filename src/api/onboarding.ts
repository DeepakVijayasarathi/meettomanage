import { apiFetch } from "@/lib/api";

/** Counts behind the admin dashboard's "Get started" checklist (GET /api/onboarding). */
export interface OnboardingStatus {
  courses: number;
  batches: number;
  teachers: number;
  parents: number;
  students: number;
  sessionsScheduled: number;
  sessionsCompleted: number;
}

export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiFetch<OnboardingStatus>("/api/onboarding");
}
