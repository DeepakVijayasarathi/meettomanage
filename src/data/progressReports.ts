export interface DemoProgressReport {
  id: string;
  childId: string;
  childName: string;
  parentName: string;
  parentEmail: string;
  periodYear: number;
  periodMonth: number;
  status: "Draft" | "Sent";
  content: string;
  sentAtUtc: string | null;
}

export const DEMO_PROGRESS_REPORTS: DemoProgressReport[] = [
  {
    id: "pr-1",
    childId: "c-1",
    childName: "Aarav Kapoor",
    parentName: "Rohit Kapoor",
    parentEmail: "rohit.kapoor@example.com",
    periodYear: 2026,
    periodMonth: 8,
    status: "Sent",
    content:
      "Aarav had a strong month in Phonics Foundations — blending three-letter words confidently and reading short sentences aloud with good pace. Next month we'll start on sight words. Attendance was excellent (7 of 7 sessions).",
    sentAtUtc: "2026-08-01T09:12:00Z",
  },
  {
    id: "pr-2",
    childId: "c-2",
    childName: "Diya Kapoor",
    parentName: "Rohit Kapoor",
    parentEmail: "rohit.kapoor@example.com",
    periodYear: 2026,
    periodMonth: 8,
    status: "Draft",
    content: "",
    sentAtUtc: null,
  },
  {
    id: "pr-3",
    childId: "c-3",
    childName: "Ishaan Verma",
    parentName: "Priya Verma",
    parentEmail: "priya.verma@example.com",
    periodYear: 2026,
    periodMonth: 8,
    status: "Draft",
    content: "Making steady progress with public speaking confidence. Still working on eye contact during presentations — will focus on this next session.",
    sentAtUtc: null,
  },
];
