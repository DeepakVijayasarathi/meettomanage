import type { TeacherPayout } from "@/types";

export const PAYOUTS: TeacherPayout[] = [
  { id: "pay-1", teacherId: "t-1", teacherName: "Karan Mehta", month: "June 2026", sessionsCompleted: 42, baseAmount: 37800, deductions: 600, waitingAmountAdded: 300, finalAmount: 37500, status: "paid" },
  { id: "pay-2", teacherId: "t-2", teacherName: "Isha Sharma", month: "June 2026", sessionsCompleted: 38, baseAmount: 41800, deductions: 0, waitingAmountAdded: 150, finalAmount: 41950, status: "paid" },
  { id: "pay-3", teacherId: "t-3", teacherName: "Rohan Verma", month: "June 2026", sessionsCompleted: 35, baseAmount: 31500, deductions: 900, waitingAmountAdded: 0, finalAmount: 30600, status: "paid" },
  { id: "pay-4", teacherId: "t-4", teacherName: "Meera Iyer", month: "June 2026", sessionsCompleted: 20, baseAmount: 26000, deductions: 0, waitingAmountAdded: 200, finalAmount: 26200, status: "paid" },
  { id: "pay-5", teacherId: "t-6", teacherName: "Sneha Kulkarni", month: "June 2026", sessionsCompleted: 18, baseAmount: 19800, deductions: 300, waitingAmountAdded: 0, finalAmount: 19500, status: "paid" },
  { id: "pay-6", teacherId: "t-1", teacherName: "Karan Mehta", month: "July 2026", sessionsCompleted: 16, baseAmount: 14400, deductions: 0, waitingAmountAdded: 150, finalAmount: 14550, status: "pending" },
  { id: "pay-7", teacherId: "t-2", teacherName: "Isha Sharma", month: "July 2026", sessionsCompleted: 15, baseAmount: 16500, deductions: 0, waitingAmountAdded: 0, finalAmount: 16500, status: "pending" },
  { id: "pay-8", teacherId: "t-3", teacherName: "Rohan Verma", month: "July 2026", sessionsCompleted: 13, baseAmount: 11700, deductions: 450, waitingAmountAdded: 0, finalAmount: 11250, status: "finalized" },
];

export function getPayoutsForTeacher(teacherId: string) {
  return PAYOUTS.filter((p) => p.teacherId === teacherId);
}
