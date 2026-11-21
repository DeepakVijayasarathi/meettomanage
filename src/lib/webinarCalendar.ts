export interface WebinarSchedule {
  startsAt: Date;
  endsAt: Date;
}

export function readWebinarSchedule(params: URLSearchParams): WebinarSchedule | null {
  const start = params.get("start") ?? "";
  const end = params.get("end") ?? "";
  const utcInstant = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (!utcInstant.test(start) || !utcInstant.test(end)) return null;
  const startsAt = new Date(start);
  const endsAt = new Date(end);
  return Number.isFinite(startsAt.getTime()) && endsAt > startsAt ? { startsAt, endsAt } : null;
}

export function webinarCalendarUrl({ startsAt, endsAt }: WebinarSchedule, registrationUrl: string, title = "Meet to Manage Webinar") {
  const calendarDate = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${calendarDate(startsAt)}/${calendarDate(endsAt)}`,
    stz: "Etc/UTC",
    etz: "Etc/UTC",
    details: "The webinar team shares live joining instructions separately.",
    location: registrationUrl,
  });
  return `https://calendar.google.com/calendar/r/eventedit?${query}`;
}

export function localWebinarTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}
