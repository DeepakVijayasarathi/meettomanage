import type { NotificationItem } from "@/types";

export const NOTIFICATIONS: NotificationItem[] = [
  { id: "n-1", title: "Fee payment received", description: "Vikram Singh paid ₹3,200 for Math Explorers Jr.", time: "10 min ago", read: false, type: "success" },
  { id: "n-2", title: "Leave request pending", description: "Isha Sharma requested leave for Jul 16 session.", time: "1 hr ago", read: false, type: "warning" },
  { id: "n-3", title: "Demo feedback overdue", description: "Feedback for Kabir Kapoor's demo is still pending.", time: "3 hrs ago", read: false, type: "danger" },
  { id: "n-4", title: "New enrollment submitted", description: "Diya Kapoor's enrollment form was submitted for review.", time: "Yesterday", read: true, type: "info" },
  { id: "n-5", title: "Batch reaching capacity", description: "Phonics-A1 is at 11/12 capacity.", time: "2 days ago", read: true, type: "info" },
  { id: "n-6", title: "Fee overdue", description: "Zara Khan's invoice INV-2026-1005 is overdue by 5 days.", time: "2 days ago", read: true, type: "danger" },
];
