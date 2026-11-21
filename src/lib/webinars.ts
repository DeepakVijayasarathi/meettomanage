import type { Webinar } from "@/api/webinars";

const academyWebinarSlug = "m2m-webinar-882af77ca6cf4ffcb9bd2dc5aa2f4712";

export function webinarPath(slug: string) {
  return `/webinars/${encodeURIComponent(slug)}`;
}

export function webinarHosts(webinar?: Webinar | null) {
  const initialHosts = webinar?.slug === academyWebinarSlug;
  return {
    hostName: webinar?.details.hostName ?? (initialHosts ? "Prithiv" : ""),
    hostRole: webinar?.details.hostRole ?? (initialHosts ? "Chief Marketing Officer" : ""),
    teamName: webinar?.details.teamName ?? (initialHosts ? "Meet to Manage team" : ""),
  };
}
