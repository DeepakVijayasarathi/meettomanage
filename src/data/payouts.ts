import type { TeacherPayout } from "@/types";

export const PAYOUTS: TeacherPayout[] = [
  {
    id: "pay-1", teacherId: "t-1", teacherName: "Karan Mehta", month: "June 2026", sessionsCompleted: 42, baseAmount: 37800, deductions: 600, waitingAmountAdded: 300, finalAmount: 37500, status: "paid",
    requiresReview: false,
    items: [
      { id: "item-1a", classSessionId: "session-1a", className: "Phonics Level 2 — Batch B", sessionDate: "2026-06-28", type: "SessionEarning", amount: 900, note: null, createdAtUtc: "2026-06-28T10:00:00Z", requiresReview: false },
      { id: "item-1b", classSessionId: "session-1b", className: "Maths Foundation — Batch A", sessionDate: "2026-06-27", type: "SessionEarning", amount: 900, note: null, createdAtUtc: "2026-06-27T10:00:00Z", requiresReview: false },
      { id: "item-1c", classSessionId: "session-1c", className: "Phonics Level 2 — Batch B", sessionDate: "2026-06-25", type: "TeacherNoShowDeduction", amount: -600, note: null, createdAtUtc: "2026-06-25T10:00:00Z", requiresReview: false },
      { id: "item-1d", classSessionId: "session-1d", className: "Maths Foundation — Batch A", sessionDate: "2026-06-20", type: "StudentNoShowWaiting", amount: 300, note: null, createdAtUtc: "2026-06-20T10:00:00Z", requiresReview: false },
    ],
  },
  { id: "pay-2", teacherId: "t-2", teacherName: "Isha Sharma", month: "June 2026", sessionsCompleted: 38, baseAmount: 41800, deductions: 0, waitingAmountAdded: 150, finalAmount: 41950, status: "paid", requiresReview: false, items: [] },
  { id: "pay-3", teacherId: "t-3", teacherName: "Rohan Verma", month: "June 2026", sessionsCompleted: 35, baseAmount: 31500, deductions: 900, waitingAmountAdded: 0, finalAmount: 30600, status: "paid", requiresReview: false, items: [] },
  { id: "pay-4", teacherId: "t-4", teacherName: "Meera Iyer", month: "June 2026", sessionsCompleted: 20, baseAmount: 26000, deductions: 0, waitingAmountAdded: 200, finalAmount: 26200, status: "paid", requiresReview: false, items: [] },
  { id: "pay-5", teacherId: "t-6", teacherName: "Sneha Kulkarni", month: "June 2026", sessionsCompleted: 18, baseAmount: 19800, deductions: 300, waitingAmountAdded: 0, finalAmount: 19500, status: "paid", requiresReview: false, items: [] },
  { id: "pay-6", teacherId: "t-1", teacherName: "Karan Mehta", month: "July 2026", sessionsCompleted: 16, baseAmount: 14400, deductions: 0, waitingAmountAdded: 150, finalAmount: 14550, status: "pending", requiresReview: false, items: [] },
  {
    id: "pay-7", teacherId: "t-2", teacherName: "Isha Sharma", month: "July 2026", sessionsCompleted: 15, baseAmount: 16500, deductions: 0, waitingAmountAdded: 0, finalAmount: 16500, status: "pending",
    requiresReview: true,
    items: [
      { id: "item-demo-1", classSessionId: "session-demo-1", className: "Spoken English — Batch C", sessionDate: "2026-07-15", type: "SessionEarning", amount: 1100, note: "Teacher attended only 10 of 45 scheduled minutes -- review before finalizing.", createdAtUtc: "2026-07-15T10:00:00Z", requiresReview: true },
    ],
  },
  { id: "pay-8", teacherId: "t-3", teacherName: "Rohan Verma", month: "July 2026", sessionsCompleted: 13, baseAmount: 11700, deductions: 450, waitingAmountAdded: 0, finalAmount: 11250, status: "finalized", requiresReview: false, items: [] },
];

export function getPayoutsForTeacher(teacherId: string) {
  return PAYOUTS.filter((p) => p.teacherId === teacherId);
}
