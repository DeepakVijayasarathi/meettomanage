import type { Role } from "@/types";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  BookOpen,
  Layers,
  CalendarDays,
  CalendarClock,
  FolderOpen,
  Receipt,
  Landmark,
  Wallet,
  Ban,
  BarChart3,
  Mail,
  Plug,
  ClipboardCheck,
  Settings,
  ClipboardList,
  CalendarOff,
  Banknote,
  Bell,
  UserPlus,
  CreditCard,
  History,
  CalendarRange,
  UserSearch,
  UserCog,
  Link2,
  KanbanSquare,
  TrendingUp,
  Gauge,
  FileBarChart,
  FileText,
  ScrollText,
  ShoppingBag,
  Star,
  PencilRuler,
  Sparkles,
  Video,
  Building2,
  Activity,
  MessageCircleQuestion,
  Radar,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const ADMIN_NAV: NavSection[] = [
  { items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true }] },
  {
    title: "Academics",
    items: [
      { label: "Courses", to: "/admin/courses", icon: BookOpen },
      { label: "Departments", to: "/admin/departments", icon: Building2 },
      { label: "Batches", to: "/admin/batches", icon: Layers },
      { label: "Academic Calendar", to: "/admin/calendar", icon: CalendarDays },
      { label: "Sessions", to: "/admin/sessions", icon: CalendarClock },
      { label: "Recordings", to: "/admin/recordings", icon: Video },
      { label: "Quiz Bank", to: "/admin/quiz-bank", icon: Sparkles },
      { label: "Activity Bank", to: "/admin/activity-bank", icon: PencilRuler },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Users", to: "/admin/users", icon: Users },
      { label: "Search Users", to: "/admin/search-users", icon: UserSearch },
      { label: "Roles & Permissions", to: "/admin/permissions", icon: ShieldCheck },
      { label: "Enrollment Review", to: "/admin/enrollments", icon: ClipboardCheck },
      { label: "Store Inquiries", to: "/admin/store-inquiries", icon: ShoppingBag },
      { label: "Parent Feedback", to: "/admin/parent-feedback", icon: Star },
      { label: "Leave Management", to: "/admin/leave", icon: CalendarOff },
      { label: "Teacher Availability", to: "/admin/availability", icon: CalendarRange },
    ],
  },
  {
    title: "Content",
    items: [{ label: "Content & Resources", to: "/admin/resources", icon: FolderOpen }],
  },
  {
    title: "Finance",
    items: [
      { label: "Billing & Finance", to: "/admin/billing", icon: Receipt },
      { label: "Packages & Subscriptions", to: "/admin/packages", icon: CreditCard },
      { label: "Payment Gateway Mapping", to: "/admin/payment-mapping", icon: Landmark },
      { label: "Teacher Payouts", to: "/admin/payouts", icon: Wallet },
      { label: "Fee Suspension", to: "/admin/fee-suspension", icon: Ban, badge: "2" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports & Analytics", to: "/admin/reports", icon: BarChart3 },
      { label: "Bulk Email", to: "/admin/bulk-email", icon: Mail },
      { label: "Bulk Email History", to: "/admin/bulk-email/history", icon: History },
      { label: "Email Templates", to: "/admin/email-templates", icon: FileText },
      { label: "Progress Reports", to: "/admin/progress-reports", icon: ScrollText },
      { label: "Doubt Chatbot", to: "/admin/chatbot", icon: MessageCircleQuestion },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings & Branding", to: "/admin/settings", icon: Settings },
      { label: "Server Monitoring", to: "/admin/monitoring", icon: Activity },
    ],
  },
];

export const TEACHER_NAV: NavSection[] = [
  { items: [{ label: "Dashboard", to: "/teacher", icon: LayoutDashboard, end: true }] },
  {
    title: "Teaching",
    items: [
      // "Live Classroom" used to be a separate nav item here, hardcoding a demo-mode-only
      // mock session id ("s-1") that always 404'd in real API mode. No fixed session id can
      // ever be right for a permanent sidebar link — "Start Class" on My Classes is the one
      // entry point that actually knows which session/room to join (see MyClasses.tsx's
      // startClass()) — so rather than point a second item at this same screen (which
      // produced a duplicate-key warning and a confusing "two links, one destination" UI),
      // My Classes is the only entry point now.
      { label: "My Classes", to: "/teacher/classes", icon: CalendarClock },
      { label: "My Students", to: "/teacher/students", icon: Users },
      { label: "Attendance & Records", to: "/teacher/attendance", icon: ClipboardList },
      { label: "Recordings", to: "/teacher/recordings", icon: Video },
      { label: "Demo Feedback", to: "/teacher/demo-feedback", icon: ClipboardCheck, badge: "1" },
      { label: "Student Doubts", to: "/teacher/doubts", icon: MessageCircleQuestion },
    ],
  },
  {
    title: "My Account",
    items: [
      { label: "Leave Management", to: "/teacher/leave", icon: CalendarOff },
      { label: "My Payout", to: "/teacher/payout", icon: Banknote },
      { label: "Resources", to: "/teacher/resources", icon: FolderOpen },
    ],
  },
];

export const PARENT_NAV: NavSection[] = [
  { items: [{ label: "Dashboard", to: "/parent", icon: LayoutDashboard, end: true }] },
  {
    title: "Learning",
    items: [
      { label: "Schedule & Live Class", to: "/parent/schedule", icon: CalendarClock },
      { label: "Resources", to: "/parent/resources", icon: FolderOpen },
      { label: "Recordings", to: "/parent/recordings", icon: Video },
      { label: "Student View", to: "/student", icon: Sparkles },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Payments & Billing", to: "/parent/billing", icon: CreditCard },
      { label: "Notifications & Reports", to: "/parent/notifications", icon: Bell },
      { label: "Add Child", to: "/parent/add-child", icon: UserPlus },
    ],
  },
];

export const SUBADMIN_NAV: NavSection[] = [
  { items: [{ label: "Dashboard", to: "/subadmin", icon: LayoutDashboard, end: true }] },
  {
    title: "Access",
    items: [
      { label: "My Permissions", to: "/subadmin/permissions", icon: ShieldCheck },
      { label: "Integrations", to: "/subadmin/integrations", icon: Plug },
    ],
  },
  {
    title: "Delegated Work",
    items: [
      { label: "Sessions", to: "/subadmin/sessions", icon: CalendarClock },
      { label: "Search Users", to: "/subadmin/search-users", icon: UserSearch },
      { label: "Assigned Reports", to: "/subadmin/reports", icon: BarChart3 },
      { label: "Audit Log", to: "/subadmin/audit-log", icon: History },
    ],
  },
];

export const ADMISSION_NAV: NavSection[] = [
  { items: [{ label: "Dashboard", to: "/admission", icon: LayoutDashboard, end: true }] },
  {
    title: "Pipeline",
    items: [
      { label: "Demo Scheduling", to: "/admission/demo-scheduling", icon: CalendarClock },
      { label: "Teacher Assignment", to: "/admission/demo-teacher-assignment", icon: UserCog },
      { label: "Demo Feedback", to: "/admission/demo-feedback", icon: ClipboardCheck },
      { label: "Conversion Board", to: "/admission/conversion", icon: KanbanSquare },
      { label: "Sessions", to: "/admission/sessions", icon: CalendarClock },
    ],
  },
  {
    title: "CRM",
    items: [
      { label: "Leads & Parents", to: "/admission/leads", icon: UserSearch },
      { label: "Search Users", to: "/admission/search-users", icon: UserSearch },
      { label: "Payment Tracking", to: "/admission/payments", icon: Link2 },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", to: "/admission/reports", icon: BarChart3 },
      { label: "Parent Feedback", to: "/admission/parent-feedback", icon: Star },
    ],
  },
];

export const COORDINATOR_NAV: NavSection[] = [
  { items: [{ label: "Dashboard", to: "/coordinator", icon: LayoutDashboard, end: true }] },
  {
    title: "Monitoring",
    items: [
      { label: "Academic Calendar", to: "/coordinator/calendar", icon: CalendarDays },
      { label: "Teacher Availability", to: "/coordinator/availability", icon: CalendarRange },
      { label: "Sessions", to: "/coordinator/sessions", icon: CalendarClock },
    ],
  },
];

export const MANAGEMENT_NAV: NavSection[] = [
  { items: [{ label: "Executive Overview", to: "/management", icon: LayoutDashboard, end: true }] },
  {
    title: "Performance",
    items: [
      { label: "Revenue & Courses", to: "/management/revenue", icon: TrendingUp },
      { label: "Teacher & Batch Performance", to: "/management/performance", icon: Gauge },
      { label: "Sessions", to: "/management/sessions", icon: CalendarClock },
    ],
  },
  {
    title: "Insights",
    items: [{ label: "Reports", to: "/management/reports", icon: FileBarChart }],
  },
];

export const STUDENT_NAV: NavSection[] = [
  { items: [{ label: "My Learning", to: "/student", icon: Sparkles, end: true }] },
];

// Demo-mode / loading fallback for the "itadmin" portal — mirrors the *real*, DB-seeded
// itadmin menu (DatabaseInitializer.EnsureItAdminMenuAsync), not ADMIN_NAV verbatim (that
// static array predates a couple of backend-only additions and carries one admin-only
// extra — "Search Users" — this list intentionally matches what IT Admin actually gets).
export const ITADMIN_NAV: NavSection[] = [
  { items: [{ label: "Overall Dashboard", to: "/itadmin", icon: LayoutDashboard, end: true }] },
  {
    title: "Academics",
    items: [
      { label: "Courses", to: "/itadmin/courses", icon: BookOpen },
      { label: "Departments", to: "/itadmin/departments", icon: Building2 },
      { label: "Batches", to: "/itadmin/batches", icon: Layers },
      { label: "Academic Calendar", to: "/itadmin/calendar", icon: CalendarDays },
      { label: "Sessions", to: "/itadmin/sessions", icon: CalendarClock },
      { label: "Quiz Bank", to: "/itadmin/quiz-bank", icon: Sparkles },
      { label: "Activity Bank", to: "/itadmin/activity-bank", icon: PencilRuler },
    ],
  },
  {
    title: "People",
    items: [
      { label: "Users", to: "/itadmin/users", icon: Users },
      { label: "Roles & Permissions", to: "/itadmin/permissions", icon: ShieldCheck },
      { label: "Enrollment Review", to: "/itadmin/enrollments", icon: ClipboardCheck },
      { label: "Store Inquiries", to: "/itadmin/store-inquiries", icon: ShoppingBag },
      { label: "Leave Management", to: "/itadmin/leave", icon: CalendarOff },
      { label: "Teacher Availability", to: "/itadmin/availability", icon: CalendarRange },
    ],
  },
  {
    title: "Content",
    items: [{ label: "Content & Resources", to: "/itadmin/resources", icon: FolderOpen }],
  },
  {
    title: "Finance",
    items: [
      { label: "Billing & Finance", to: "/itadmin/billing", icon: Receipt },
      { label: "Packages & Subscriptions", to: "/itadmin/packages", icon: CreditCard },
      { label: "Payment Gateway Mapping", to: "/itadmin/payment-mapping", icon: Landmark },
      { label: "Teacher Payouts", to: "/itadmin/payouts", icon: Wallet },
      { label: "Fee Suspension", to: "/itadmin/fee-suspension", icon: Ban },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports & Analytics", to: "/itadmin/reports", icon: BarChart3 },
      { label: "Bulk Email", to: "/itadmin/bulk-email", icon: Mail },
      { label: "Bulk Email History", to: "/itadmin/bulk-email/history", icon: History },
      { label: "Email Templates", to: "/itadmin/email-templates", icon: FileText },
      { label: "Progress Reports", to: "/itadmin/progress-reports", icon: ScrollText },
      { label: "Doubt Chatbot", to: "/itadmin/chatbot", icon: MessageCircleQuestion },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Settings & Branding", to: "/itadmin/settings", icon: Settings },
      { label: "Server Monitoring", to: "/itadmin/monitoring", icon: Activity },
      { label: "Class Session Logs", to: "/itadmin/class-logs", icon: Radar },
    ],
  },
];

export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  admin: ADMIN_NAV,
  teacher: TEACHER_NAV,
  parent: PARENT_NAV,
  subadmin: SUBADMIN_NAV,
  admission: ADMISSION_NAV,
  coordinator: COORDINATOR_NAV,
  management: MANAGEMENT_NAV,
  student: STUDENT_NAV,
  itadmin: ITADMIN_NAV,
};
