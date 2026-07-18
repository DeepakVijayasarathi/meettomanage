export type Role =
  | "admin"
  | "subadmin"
  | "admission"
  | "teacher"
  | "parent"
  | "student"
  | "coordinator"
  | "management";

export type UserStatus = "active" | "inactive" | "suspended";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: UserStatus;
  avatarColor: string;
  joinedOn: string;
  department?: "Phonics" | "Maths";
}

export interface Child {
  id: string;
  parentId: string;
  name: string;
  age: number;
  grade: string;
  avatarColor: string;
  courseId: string;
  batchId: string;
  classesCompleted: number;
  classesRemaining: number;
  attendancePercent: number;
  feeStatus: "paid" | "due" | "overdue" | "suspended";
  enrollmentComplete: boolean;
}

export type CourseType = "1:1" | "group" | "demo";
export type ClassDuration = 30 | 45 | 60;

export interface Course {
  id: string;
  name: string;
  category: "Phonics" | "Maths" | "Reading" | "Writing" | "Speaking";
  type: CourseType;
  duration: ClassDuration;
  price: number;
  activeBatches: number;
  totalEnrolled: number;
  revenue: number;
  status: "active" | "draft" | "archived";
}

export type BatchStatus = "active" | "dormant" | "upcoming";

export interface Batch {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  type: CourseType;
  duration: ClassDuration;
  capacity: number;
  enrolled: number;
  status: BatchStatus;
  schedule: string;
  startDate: string;
}

export type SessionStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "noshow"
  | "demo"
  | "rescheduled"
  | "holiday"
  | "leave";

export interface ClassSession {
  id: string;
  title: string;
  batchId?: string;
  courseId?: string;
  teacherId: string;
  teacherName: string;
  childIds: string[];
  date: string;
  startTime: string;
  duration: ClassDuration;
  status: SessionStatus;
  type: CourseType;
  recordingAvailable?: boolean;
  recordingExpiresOn?: string;
  /** Jitsi room id from the backend; present only on API-backed sessions. */
  meetingRoomId?: string;
}

export interface Invoice {
  id: string;
  /** Real backend invoice Guid (id above is the display invoice number); present in API mode only. */
  apiId?: string;
  parentId: string;
  childName: string;
  department: "Phonics" | "Maths";
  amount: number;
  /** Amount settled so far; balance due = amount - amountPaid. Present in API mode. */
  amountPaid?: number;
  status: "paid" | "pending" | "overdue" | "partial";
  issuedOn: string;
  dueOn: string;
  courseName: string;
}

export interface TeacherPayout {
  id: string;
  teacherId: string;
  teacherName: string;
  month: string;
  sessionsCompleted: number;
  baseAmount: number;
  deductions: number;
  waitingAmountAdded: number;
  finalAmount: number;
  status: "calculated" | "paid";
}

export interface LeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  sessionId?: string;
  date: string;
  session: string;
  reason: string;
  hoursBeforeSession: number;
  status: "pending" | "approved" | "rejected" | "blocked";
}

export interface DemoFeedback {
  id: string;
  childName: string;
  parentName: string;
  teacherName: string;
  demoDate: string;
  academicLevel: string;
  strengths: string;
  improvementAreas: string;
  recommendedCourse: string;
  suggestedBatchType: CourseType;
  remarks: string;
  submitted: boolean;
}

export interface Resource {
  id: string;
  title: string;
  type: "book" | "worksheet" | "recording";
  courseCategory: Course["category"];
  batchId?: string;
  uploadedOn: string;
  downloadable: boolean;
  visibleToParents: boolean;
  sizeLabel?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "info" | "success" | "warning" | "danger";
}

export interface KpiTrend {
  label: string;
  value: number;
}

export interface ChatMessage {
  id: string;
  author: string;
  text: string;
  time: string;
  isSelf?: boolean;
}

export interface Participant {
  id: string;
  name: string;
  role: "teacher" | "student";
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  avatarColor: string;
  speaking?: boolean;
}
