import { apiFetchGlobal } from "@/lib/api";
import type { ApiPaged, ApiPlatformDemoRequest } from "@/api/marketing";

const root = "/api/marketing/webinars";

export interface WebinarDetails {
  description: string;
  benefits: string;
  offers: string;
  start: string;
  end: string;
  bannerImage?: string | null;
}

export interface Webinar {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  isPublished: boolean;
  details: WebinarDetails;
}

export type WebinarSummary = Pick<Webinar, "id" | "slug" | "title" | "excerpt"> & Pick<WebinarDetails, "start" | "end">;
type WebinarInput = Pick<Webinar, "title" | "excerpt" | "isPublished"> & WebinarDetails;

export const listWebinars = () => apiFetchGlobal<WebinarSummary[]>(root, undefined, false);
export const getWebinar = (slug: string) => apiFetchGlobal<Webinar>(`${root}/${encodeURIComponent(slug)}`, undefined, false);
export const registerForWebinar = (slug: string, input: { fullName: string; workEmail: string; phone: string; academyName: string }) =>
  apiFetchGlobal<void>(`${root}/${encodeURIComponent(slug)}/register`, { method: "POST", body: JSON.stringify(input) }, false);
export const listManagedWebinars = () => apiFetchGlobal<Webinar[]>(`${root}/manage`);
export type WebinarRegistration = Pick<ApiPlatformDemoRequest, "id" | "fullName" | "workEmail" | "phone" | "academyName" | "createdAtUtc">;
export const listWebinarRegistrations = (id: string, page: number) =>
  apiFetchGlobal<ApiPaged<WebinarRegistration>>(`${root}/manage/${id}/registrations?page=${page}`);
export const saveWebinar = (input: WebinarInput, id?: string) => apiFetchGlobal<void>(
  id ? `${root}/manage/${id}` : `${root}/manage`,
  { method: id ? "PUT" : "POST", body: JSON.stringify(input) },
);
export const startWebinar = (id: string) => apiFetchGlobal<{ url: string }>(`${root}/manage/${id}/host`, { method: "POST" });
export const createWebinarAttendeeLink = (id: string) =>
  apiFetchGlobal<{ url: string; expiresAtUtc: string }>(`${root}/manage/${id}/attendee-link`, { method: "POST" });
