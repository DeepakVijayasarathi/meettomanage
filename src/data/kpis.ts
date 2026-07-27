import { COURSES } from "@/data/courses";

/** Demo-mode course-wise revenue, derived from the same mock courses the Admin/Management course tables use. */
export const COURSE_REVENUE = COURSES.filter((c) => c.revenue > 0)
  .map((c) => ({ course: c.name, revenue: c.revenue }))
  .sort((a, b) => b.revenue - a.revenue);

export const ADMIN_KPIS = {
  totalStudents: 312,
  activeStudents: 268,
  revenueThisMonth: 486200,
  revenueGrowth: 8.4,
  enrollments: 34,
  conversionRate: 42,
  teacherUtilization: 81,
  attendanceRate: 91,
  renewalRate: 76,
  refundRate: 3.2,
  batchOccupancy: 84,
};

export const REVENUE_TREND = [
  { month: "Feb", revenue: 356000 },
  { month: "Mar", revenue: 378500 },
  { month: "Apr", revenue: 402100 },
  { month: "May", revenue: 411800 },
  { month: "Jun", revenue: 448900 },
  { month: "Jul", revenue: 486200 },
];

export const ENROLLMENT_FUNNEL = [
  { stage: "Demo Scheduled", value: 120 },
  { stage: "Demo Completed", value: 96 },
  { stage: "Follow-up", value: 58 },
  { stage: "Partially Paid", value: 41 },
  { stage: "Enrolled", value: 34 },
];

export const ATTENDANCE_TREND = [
  { week: "W1", attendance: 88 },
  { week: "W2", attendance: 90 },
  { week: "W3", attendance: 93 },
  { week: "W4", attendance: 91 },
];

export const BATCH_OCCUPANCY_BY_COURSE = [
  { course: "Phonics", occupancy: 88 },
  { course: "Maths", occupancy: 82 },
  { course: "Reading", occupancy: 67 },
  { course: "Writing", occupancy: 90 },
  { course: "Speaking", occupancy: 55 },
];

export const TEACHER_UTILIZATION = [
  { teacher: "Karan M.", utilization: 92 },
  { teacher: "Isha S.", utilization: 88 },
  { teacher: "Rohan V.", utilization: 74 },
  { teacher: "Meera I.", utilization: 65 },
  { teacher: "Sneha K.", utilization: 58 },
];

export const DEPARTMENT_REVENUE = [
  { department: "Phonics", value: 268000, color: "#F08A1D" },
  { department: "Maths", value: 218200, color: "#8B5CF6" },
];
