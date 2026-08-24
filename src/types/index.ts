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
  department?: string;
  departmentId?: string;
  /** Assigned named role (preset) id; only meaningful for Sub Admin accounts. */
  roleDefinitionId?: string;
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
  /** Course category display name — the course's own CourseCategory, or its department when no category name applies. Any admin-defined category/department is valid, not a fixed set. */
  category: string;
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
  /** Teacher's class notes, or an auto-generated one from engagement data if they left it blank — set on completion. */
  summary?: string;
}

export interface Invoice {
  id: string;
  /** Real backend invoice Guid (id above is the display invoice number); present in API mode only. */
  apiId?: string;
  parentId: string;
  /** Real backend child Guid, when the invoice is linked to one; present in API mode only. */
  childId?: string;
  childName: string;
  department: string;
  amount: number;
  /** Amount settled so far; balance due = amount - amountPaid. Present in API mode. */
  amountPaid?: number;
  status: "paid" | "pending" | "overdue" | "partial" | "cancelled";
  issuedOn: string;
  dueOn: string;
  courseName: string;
  /** Resolved invoicing-parent display name; "—" when unresolved (e.g. demo mode's mock rows). */
  parentName: string;
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
  /** pending: still accruing, amount can change. finalized: locked, awaiting payment. paid: done. */
  status: "pending" | "finalized" | "paid";
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
  // Demo mode only, where the mock data has a real category per resource. Live-mode
  // resources don't carry this (the API has no per-resource category), so it's undefined
  // there — display code must fall back to batchName rather than assert a fake value.
  courseCategory?: Course["category"];
  batchId?: string;
  /** Live mode: the resource's linked batch name (from the API). Demo mode resolves this
   *  from BATCHES by batchId instead — see admin/Resources.tsx. */
  batchName?: string;
  uploadedOn: string;
  downloadable: boolean;
  /**
   * Demo mode: a real, editable flag on the mock data. API mode: visibility is
   * actually granted per parent (ResourceAccess), not a single yes/no for the
   * resource — undefined here means "ask the grants API," not "not visible."
   */
  visibleToParents?: boolean;
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

export interface MonitoredService {
  name: string;
  active: boolean;
}

export interface LiveCallSummary {
  activeConferences: number;
  totalParticipants: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface CallQuality {
  averageRttMs: number;
  incomingLossPercent: number;
  outgoingLossPercent: number;
  incomingBitrateKbps: number;
  outgoingBitrateKbps: number;
  endpointsSendingAudio: number;
  endpointsSendingVideo: number;
  jvbStressPercent: number;
  jvbHealthy: boolean;
}

export interface CapacityForecast {
  isFilling: boolean;
  daysUntilFull: number | null;
  trendGbPerDay: number;
}

export interface ServerStatus {
  name: string;
  hostname: string;
  /** false means the agent itself couldn't be reached — every other field is meaningless then, not zero. */
  reachable: boolean;
  error?: string | null;
  uptimeSeconds: number;
  loadAverage1m: number;
  cpuCores: number;
  cpuUsagePercent: number;
  memoryUsedPercent: number;
  memoryTotalMb: number;
  diskUsedPercent: number;
  diskTotalGb: number;
  networkRxMbps: number;
  networkTxMbps: number;
  diskReadMbps: number;
  diskWriteMbps: number;
  services: MonitoredService[];
  /** How long ago the agent last wrote its status file — large even while reachable means the agent/cron is stuck. */
  agentDataAgeSeconds: number;
  liveCalls: LiveCallSummary | null;
  /** Last hour, ~2-minute steps. Empty when unreachable. */
  cpuHistory: TimeSeriesPoint[];
  memoryHistory: TimeSeriesPoint[];
  callQuality: CallQuality | null;
  diskForecast: CapacityForecast | null;
}

export interface DatabaseInsights {
  activeConnections: number;
  maxConnections: number;
  commitsPerSecond: number;
  rollbacksPerSecond: number;
  cacheHitRatioPercent: number;
  databaseSizeMb: number;
  deadlocksTotal: number;
  locksHeld: number;
}

export interface MonitoringAlert {
  name: string;
  severity: string;
  summary: string;
  description: string;
  state: string;
  activeSince: string;
  instance: string | null;
}

export interface MonitoringSummary {
  servers: ServerStatus[];
  apiHealthy: boolean;
  databaseHealthy: boolean;
  databaseLatencyMs: number;
  databaseInsights: DatabaseInsights | null;
  /** Total connections currently joined to any live class, platform-wide — distinct from a single server's own Jitsi participant count. */
  concurrentClassroomUsers: number;
  activeClassCount: number;
  activeAlerts: MonitoringAlert[];
  generatedAtUtc: string;
}
