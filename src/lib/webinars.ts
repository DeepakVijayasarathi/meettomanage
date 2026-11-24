import type { Webinar } from "@/api/webinars";

const academyWebinarSlug = "m2m-webinar-882af77ca6cf4ffcb9bd2dc5aa2f4712";

export function webinarPath(slug: string) {
  return `/webinars/${encodeURIComponent(slug)}`;
}

export function isAcademyWebinar(webinar?: Webinar | null) {
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
