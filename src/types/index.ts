export type Role =
  | "admin"
  | "subadmin"
  | "admission"
  | "teacher"
  | "parent"
  | "student"
  | "coordinator"
  | "management"
  | "itadmin";

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
  /** Undefined when this child has no attendance-marked sessions yet — distinct from a real 0%. */
  attendancePercent?: number;
  feeStatus: "paid" | "due" | "overdue" | "suspended";
  enrollmentComplete: boolean;
}

export type CourseType = "1:1" | "group" | "demo";
/** Minutes -- any positive length, not a fixed 30/45/60 set. */
export type ClassDuration = number;

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
  /** Set only when status is "noshow" — which side the system found missing, so a teacher
   *  can tell at a glance whether it was them (docks pay) or the student (doesn't) instead
   *  of a single generic "No-Show" badge reading as if it's always blaming them. */
  noShowParty?: "teacher" | "student";
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
  /** True when a session's captured teacher attendance fell well short of its scheduled duration -- must be resolved (adjusted or confirmed) before this payout can be finalized. */
  requiresReview: boolean;
  items: TeacherPayoutItem[];
}

/**
 * Status + total only — what a non-Admin role (e.g. Management, via the teacher-performance
 * report) is allowed to see: never the itemized breakdown TeacherPayout carries, since that
 * detail stays behind GET /api/payouts (Admin-only — "payout/salary details are Super-Admin
 * only"). Deliberately structurally narrower than TeacherPayout, not just TeacherPayout with
 * fields omitted, so a summary-only caller can never accidentally read line items it was
 * never given.
 */
export interface TeacherPayoutSummary {
  month: string;
  status: "pending" | "finalized" | "paid";
  finalAmount: number;
}

export interface TeacherPayoutItem {
  id: string;
  classSessionId: string | null;
  /** The batch this item's class belongs to -- null for items with no classSessionId (a bonus/adjustment with no single class behind it). */
  className: string | null;
  /** The class's own scheduled start, not when this payout item was created. */
  sessionDate: string | null;
  type: string;
  amount: number;
  note: string | null;
  createdAtUtc: string;
  requiresReview: boolean;
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
  status: "pending" | "approved" | "rejected" | "blocked" | "cancelled";
  /** Full UTC window this leave covers — present in API mode only (see toFrontendLeave). Used to warn before submitting a new request that overlaps an existing one, the same way the backend itself blocks it. */
  startAtUtc?: string;
  endAtUtc?: string;
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
  /** App-relative path (role-aware) to the page this notification is about — the
   *  bell and the full Notifications list both navigate here on click, when set. */
  route?: string;
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

/** Jibri (recording) fleet status — one recording per instance, so busy === total means the next concurrent recording request will fail until the autoscaler adds capacity. */
export interface RecorderStatus {
  totalInstances: number;
  busyInstances: number;
  idleInstances: number;
  /** Admin-adjustable floor of always-warm instances. */
  minInstances: number;
  /** Ceiling derived from the box's actual CPU/RAM — grows on its own if the box is resized. */
  maxInstances: number;
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

/** One connected user in a live class, for the admin "who's live right now" view. */
export interface LiveParticipant {
  userId: string;
  name: string;
  role: string;
  joinedAtUtc: string;
  /** 2+ means this person holds multiple simultaneous connections (tabs/devices). */
  connectionCount: number;
  /** Whether attendance capture has already recorded this person's presence — false can mean it's still catching up, or that it failed. */
  attendanceRecorded: boolean;
}

/** One live class session with everyone currently connected to it. */
export interface LiveClassSession {
  sessionId: string;
  courseName: string;
  /** Null for a demo session, which has no batch. */
  batchName: string | null;
  teacherName: string;
  startedAtUtc: string | null;
  /** Null for a demo session. Running past this is worth flagging. */
  scheduledEndAtUtc: string | null;
  participants: LiveParticipant[];
}

/** One of today's class sessions, live or not — for the "today's sessions" timeline. */
export interface SessionHistoryEntry {
  sessionId: string;
  courseName: string;
  batchName: string | null;
  teacherName: string;
  scheduledStartAtUtc: string;
  scheduledEndAtUtc: string;
  actualStartAtUtc: string | null;
  actualEndAtUtc: string | null;
  status: string;
  attendedCount: number;
  expectedCount: number;
}

/** A point-in-time `docker stats` sample for one container — not a counter, so it's "what is this using right now," refreshed every minute. */
export interface ContainerMetric {
  name: string;
  cpuPercent: number;
  memoryMb: number;
}

/** Week-over-week load trend — honest direction/peak reporting for bursty signals (CPU, recording load) instead of a fake day-countdown like CapacityForecast. */
export interface CapacityTrend {
  cpuAvg7dPercent: number;
  cpuPeak7dPercent: number;
  cpuWeekOverWeekChangePercent: number;
  /** Percent of the last 7 days spent with every Jibri instance busy — null for a server with no Jibri fleet. */
  recordingAtCapacityPercent7d: number | null;
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
  /** 0 when the server has no swap configured — show the gauge only when swapTotalMb > 0. */
  swapUsedPercent: number;
  swapTotalMb: number;
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
  recorderStatus: RecorderStatus | null;
  /** Last hour, ~2-minute steps. Empty when unreachable. */
  cpuHistory: TimeSeriesPoint[];
  memoryHistory: TimeSeriesPoint[];
  callQuality: CallQuality | null;
  diskForecast: CapacityForecast | null;
  /** Sorted by CPU descending — empty if the container-stats collector hasn't published on this box yet. */
  containerMetrics: ContainerMetric[];
  /** Null until there's 14 days of Prometheus history to compare against. */
  capacityTrend: CapacityTrend | null;
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
