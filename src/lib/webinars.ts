import type { Webinar } from "@/api/webinars";

const academyWebinarSlug = "m2m-webinar-882af77ca6cf4ffcb9bd2dc5aa2f4712";
const academyWebinarPublicSlug = "academy-management-webinar-december-2026";

export function webinarPath(slug: string) {
  return `/webinars/${encodeURIComponent(slug === academyWebinarSlug ? academyWebinarPublicSlug : slug)}`;
}

export function webinarApiSlug(slug: string) {
  return slug === academyWebinarPublicSlug ? academyWebinarSlug : slug;
}

export function isAcademyWebinar(webinar?: Pick<Webinar, "slug"> | null) {
  return webinar?.slug === academyWebinarSlug;
}

export function webinarHosts(webinar?: Webinar | null) {
  const initialHosts = isAcademyWebinar(webinar);
  return {
    hostName: webinar?.details.hostName ?? (initialHosts ? "Prithivi S" : ""),
    hostRole: webinar?.details.hostRole ?? (initialHosts ? "Co-founder & Chief of Marketing" : ""),
    teamName: webinar?.details.teamName ?? (initialHosts ? "Meet to Manage team" : ""),
  };
}
