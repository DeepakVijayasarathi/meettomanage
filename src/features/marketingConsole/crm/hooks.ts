import { useToast } from "@/hooks/use-toast";
import { useApiData } from "@/api/hooks";
import { apiEnabled, userMessage } from "@/lib/api";
import { getCrmMe, listCrmTeam, listFollowUpPlans, type CrmMe, type CrmMember, type FollowUpPlan } from "@/api/crm";

/** The ready-made follow-up plans (call / WhatsApp sequences). */
export function useFollowUpPlans() {
  const { data } = useApiData(listFollowUpPlans, [] as FollowUpPlan[], [] as FollowUpPlan[], { cacheKey: "crm-plans", ttlMs: 10 * 60_000 });
  return data;
}

/** "Day 0 call, day 1 WhatsApp, ..." in one short line. */
export const planSummary = (plan: FollowUpPlan) =>
  plan.steps.map((s) => `day ${s.day} ${s.type === "WhatsApp" ? "WhatsApp" : s.type === "Call" ? "call" : s.type.toLowerCase()}`).join(", ");

const ME_FALLBACK: CrmMe = { userId: null, name: "", role: "Manager" };

/** The signed-in user's CRM role; offline demo mode acts as a manager. */
export function useCrmMe() {
  const { data } = useApiData(getCrmMe, ME_FALLBACK, ME_FALLBACK, { cacheKey: "crm-me", ttlMs: 60_000 });
  return { ...data, canWrite: data.role !== "Viewer", isManager: data.role === "Manager" };
}

export function useCrmTeam() {
  const { data, reload } = useApiData(listCrmTeam, [] as CrmMember[], [] as CrmMember[], { cacheKey: "crm-team", ttlMs: 60_000 });
  // `active` is who can own leads and tasks: active managers and sales reps. Viewers are read-only.
  return { team: data, active: data.filter((m) => m.active && m.role !== "Viewer"), reload };
}

export const when = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "";

/** A datetime-local value (local time) for N days from now at the given hour. */
export function localInput(daysAhead: number, hour = 10) {
  const d = new Date(); d.setDate(d.getDate() + daysAhead); d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export const SELECT = "h-10 w-full rounded-md border bg-background px-3 text-sm";

/** Runs a change, toasting a failure (and an optional success); returns true when it worked. */
export function useRun() {
  const { toast } = useToast();
  return async (work: () => Promise<unknown>, success?: string): Promise<boolean> => {
    if (!apiEnabled()) { toast({ variant: "error", title: "Demo mode", description: "Nothing was changed." }); return false; }
    try { await work(); if (success) toast({ variant: "success", title: success }); return true; }
    catch (err) { toast({ variant: "error", title: "Couldn't save", description: userMessage(err) }); return false; }
  };
}

/** The lead's own page in the marketing console. */
export const leadPath = (id: string) => `/marketing/leads/${id}`;
