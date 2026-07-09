import type { Invoice } from "@/types";

export const INVOICES: Invoice[] = [
  { id: "INV-2026-1001", parentId: "p-1", childName: "Aarav Kapoor", department: "Phonics", amount: 2500, status: "paid", issuedOn: "2026-06-01", dueOn: "2026-06-10", courseName: "Phonics Foundations" },
  { id: "INV-2026-1002", parentId: "p-1", childName: "Diya Kapoor", department: "Phonics", amount: 2800, status: "pending", issuedOn: "2026-07-01", dueOn: "2026-07-12", courseName: "Reading Adventures" },
  { id: "INV-2026-1003", parentId: "p-2", childName: "Ishaan Singh", department: "Maths", amount: 3200, status: "paid", issuedOn: "2026-06-28", dueOn: "2026-07-05", courseName: "Math Explorers Jr" },
  { id: "INV-2026-1004", parentId: "p-3", childName: "Ananya Gupta", department: "Phonics", amount: 2500, status: "paid", issuedOn: "2026-06-15", dueOn: "2026-06-25", courseName: "Phonics Foundations" },
  { id: "INV-2026-1005", parentId: "p-4", childName: "Zara Khan", department: "Maths", amount: 5200, status: "overdue", issuedOn: "2026-06-01", dueOn: "2026-06-10", courseName: "Math Champions" },
  { id: "INV-2026-1006", parentId: "p-5", childName: "Vivaan Bhatt", department: "Phonics", amount: 3000, status: "paid", issuedOn: "2026-06-20", dueOn: "2026-06-30", courseName: "Creative Writing Workshop" },
  { id: "INV-2026-1007", parentId: "p-6", childName: "Myra Joshi", department: "Phonics", amount: 4500, status: "overdue", issuedOn: "2026-05-25", dueOn: "2026-06-04", courseName: "Advanced Phonics Mastery" },
  { id: "INV-2026-1008", parentId: "p-7", childName: "Reyansh Reddy", department: "Phonics", amount: 2500, status: "partial", issuedOn: "2026-06-18", dueOn: "2026-06-28", courseName: "Phonics Foundations" },
  { id: "INV-2026-1009", parentId: "p-8", childName: "Sara Malhotra", department: "Phonics", amount: 2500, status: "paid", issuedOn: "2026-06-05", dueOn: "2026-06-15", courseName: "Phonics Foundations" },
  { id: "INV-2026-1010", parentId: "p-1", childName: "Aarav Kapoor", department: "Phonics", amount: 2500, status: "paid", issuedOn: "2026-05-01", dueOn: "2026-05-10", courseName: "Phonics Foundations" },
];

export function getInvoicesForParent(parentId: string) {
  return INVOICES.filter((i) => i.parentId === parentId);
}
