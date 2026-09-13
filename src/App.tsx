import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Logo } from "@/components/Logo";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

const MarketingHome = lazy(() => import("@/features/marketing/Home"));
const Store = lazy(() => import("@/features/marketing/Store"));
const Login = lazy(() => import("@/features/auth/Login"));
const PortalSelect = lazy(() => import("@/features/auth/PortalSelect"));
const ForgotPin = lazy(() => import("@/features/auth/ForgotPin"));
const ResetPin = lazy(() => import("@/features/auth/ResetPin"));
const NotFound = lazy(() => import("@/features/auth/NotFound"));

const AdminDashboard = lazy(() => import("@/features/admin/Dashboard"));
const AdminUsers = lazy(() => import("@/features/admin/Users"));
const AdminPermissions = lazy(() => import("@/features/admin/Permissions"));
const AdminCourses = lazy(() => import("@/features/admin/Courses"));
const AdminDepartments = lazy(() => import("@/features/admin/Departments"));
const AdminQuizQuestions = lazy(() => import("@/features/admin/QuizQuestions"));
const AdminActivityBank = lazy(() => import("@/features/admin/ActivityBank"));
const AdminBatches = lazy(() => import("@/features/admin/Batches"));
const AdminAcademicCalendar = lazy(() => import("@/features/admin/AcademicCalendar"));
const AdminSessions = lazy(() => import("@/features/admin/Sessions"));
const AdminResources = lazy(() => import("@/features/admin/Resources"));
const AdminBilling = lazy(() => import("@/features/admin/Billing"));
const AdminPackages = lazy(() => import("@/features/admin/Packages"));
const AdminPaymentMapping = lazy(() => import("@/features/admin/PaymentMapping"));
const AdminPayouts = lazy(() => import("@/features/admin/Payouts"));
const AdminFeeSuspension = lazy(() => import("@/features/admin/FeeSuspension"));
const AdminReports = lazy(() => import("@/features/admin/Reports"));
const AdminBulkEmail = lazy(() => import("@/features/admin/BulkEmail"));
const AdminBulkEmailHistory = lazy(() => import("@/features/admin/BulkEmailHistory"));
const AdminEmailTemplates = lazy(() => import("@/features/admin/EmailTemplates"));
const AdminProgressReports = lazy(() => import("@/features/admin/ProgressReports"));
const AdminChatbot = lazy(() => import("@/features/admin/ChatbotAdmin"));
const AdminEnrollments = lazy(() => import("@/features/admin/Enrollments"));
const AdminSearchUsers = lazy(() => import("@/features/admin/SearchUsers"));
const AdminStoreInquiries = lazy(() => import("@/features/admin/StoreInquiries"));
const AdminLeave = lazy(() => import("@/features/admin/Leave"));
const AdminAvailability = lazy(() => import("@/features/admin/Availability"));
const AdminSettings = lazy(() => import("@/features/admin/Settings"));
const AdminMonitoring = lazy(() => import("@/features/admin/Monitoring"));
const AdminServerDetail = lazy(() => import("@/features/admin/ServerDetail"));
const AdminClassSessionLogs = lazy(() => import("@/features/admin/ClassSessionLogs"));

const ItAdminDashboard = lazy(() => import("@/features/itadmin/Dashboard"));

const TeacherDashboard = lazy(() => import("@/features/teacher/Dashboard"));
const TeacherMyClasses = lazy(() => import("@/features/teacher/MyClasses"));
const TeacherAttendance = lazy(() => import("@/features/teacher/Attendance"));
const TeacherDemoFeedback = lazy(() => import("@/features/teacher/DemoFeedback"));
const TeacherLeave = lazy(() => import("@/features/teacher/Leave"));
const TeacherPayout = lazy(() => import("@/features/teacher/Payout"));
const TeacherResources = lazy(() => import("@/features/teacher/Resources"));
const TeacherRecordings = lazy(() => import("@/features/teacher/Recordings"));
const TeacherDoubts = lazy(() => import("@/features/teacher/TeacherDoubts"));

const ParentDashboard = lazy(() => import("@/features/parent/Dashboard"));
const ParentEnrollment = lazy(() => import("@/features/parent/Enrollment"));
const ParentSchedule = lazy(() => import("@/features/parent/Schedule"));
const ParentResources = lazy(() => import("@/features/parent/Resources"));
const ParentRecordings = lazy(() => import("@/features/parent/Recordings"));
const ParentBilling = lazy(() => import("@/features/parent/Billing"));
const ParentNotifications = lazy(() => import("@/features/parent/Notifications"));
const ParentAddChild = lazy(() => import("@/features/parent/AddChild"));

const LiveClassroom = lazy(() => import("@/features/classroom/LiveClassroom"));
const PersonalMeetingRoom = lazy(() => import("@/features/classroom/PersonalMeetingRoom"));
const RecordingObserver = lazy(() => import("@/features/classroom/RecordingObserver"));
const RecordingRender = lazy(() => import("@/features/classroom/RecordingRender"));

const SubAdminDashboard = lazy(() => import("@/features/subadmin/Dashboard"));
const SubAdminPermissions = lazy(() => import("@/features/subadmin/Permissions"));
const SubAdminIntegrations = lazy(() => import("@/features/subadmin/Integrations"));
const SubAdminClassSessionLogs = lazy(() => import("@/features/subadmin/ClassSessionLogs"));
const SubAdminBatches = lazy(() => import("@/features/subadmin/Batches"));
const SubAdminSessions = lazy(() => import("@/features/subadmin/Sessions"));
const SubAdminPayouts = lazy(() => import("@/features/subadmin/Payouts"));
const SubAdminCourses = lazy(() => import("@/features/subadmin/Courses"));
const SubAdminDepartments = lazy(() => import("@/features/subadmin/Departments"));
const SubAdminQuizQuestions = lazy(() => import("@/features/subadmin/QuizQuestions"));
const SubAdminActivityBank = lazy(() => import("@/features/subadmin/ActivityBank"));
const SubAdminResources = lazy(() => import("@/features/subadmin/Resources"));
const SubAdminPackages = lazy(() => import("@/features/subadmin/Packages"));
const SubAdminBilling = lazy(() => import("@/features/subadmin/Billing"));
const SubAdminEnrollments = lazy(() => import("@/features/subadmin/Enrollments"));
const SubAdminFeeSuspension = lazy(() => import("@/features/subadmin/FeeSuspension"));
const SubAdminPaymentMapping = lazy(() => import("@/features/subadmin/PaymentMapping"));
const SubAdminUsers = lazy(() => import("@/features/subadmin/Users"));
const SubAdminReports = lazy(() => import("@/features/subadmin/Reports"));
const SubAdminAuditLog = lazy(() => import("@/features/subadmin/AuditLog"));
const SubAdminBulkEmail = lazy(() => import("@/features/subadmin/BulkEmail"));
const SubAdminEmailTemplates = lazy(() => import("@/features/subadmin/EmailTemplates"));
const SubAdminChatbot = lazy(() => import("@/features/subadmin/ChatbotAdmin"));
const SubAdminProgressReports = lazy(() => import("@/features/subadmin/ProgressReports"));
const SubAdminStoreInquiries = lazy(() => import("@/features/subadmin/StoreInquiries"));

const AdmissionDashboard = lazy(() => import("@/features/admission/Dashboard"));
const AdmissionDemoScheduling = lazy(() => import("@/features/admission/DemoScheduling"));
const AdmissionDemoTeacherAssignment = lazy(() => import("@/features/admission/DemoTeacherAssignment"));
const AdmissionDemoFeedback = lazy(() => import("@/features/admission/DemoFeedback"));
const AdmissionLeads = lazy(() => import("@/features/admission/Leads"));
const AdmissionPayments = lazy(() => import("@/features/admission/Payments"));
const AdmissionConversion = lazy(() => import("@/features/admission/Conversion"));
const AdmissionReports = lazy(() => import("@/features/admission/Reports"));

const CoordinatorDashboard = lazy(() => import("@/features/coordinator/Dashboard"));
const CoordinatorCalendar = lazy(() => import("@/features/coordinator/Calendar"));
const CoordinatorAvailability = lazy(() => import("@/features/coordinator/Availability"));

const ManagementDashboard = lazy(() => import("@/features/management/Dashboard"));
const ManagementRevenue = lazy(() => import("@/features/management/Revenue"));
const ManagementPerformance = lazy(() => import("@/features/management/Performance"));
const ManagementReports = lazy(() => import("@/features/management/Reports"));

const StudentDashboard = lazy(() => import("@/features/student/Dashboard"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Logo showWordmark={false} imgClassName="h-12 w-12 animate-pulse" />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <AppErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<MarketingHome />} />
            <Route path="/store" element={<Store />} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal-select" element={<PortalSelect />} />
            <Route path="/forgot-pin" element={<ForgotPin />} />
            {/* Legacy path, kept as a redirect for old bookmarks/links. */}
            <Route path="/forgot-password" element={<Navigate to="/forgot-pin" replace />} />
            <Route path="/reset-pin" element={<ResetPin />} />

            {/* Immersive, full-screen classroom — rendered outside the portal shell */}
            <Route
              path="/teacher/live/:sessionId"
              element={
                <RequireAuth role="teacher">
                  <LiveClassroom mode="teacher" />
                </RequireAuth>
              }
            />
            <Route
              path="/parent/live/:sessionId"
              element={
                // also={["student"]}: the Student Experience dashboard's own "Join Class" CTA
                // links here directly (it's the same kid-facing classroom, just reached via the
                // /student preview instead of the parent portal) — without this a student-role
                // session got silently bounced back to /student instead of joining.
                <RequireAuth role="parent" also={["student"]}>
                  <LiveClassroom mode="student" />
                </RequireAuth>
              }
            />
            {/* Loaded only by Jibri's own headless Chrome (proxied here by nginx on the Jitsi
                server — see docs/JITSI_ARCHITECTURE.md's recording-observer section), never by
                a real signed-in user — deliberately outside RequireAuth, which would otherwise
                bounce Jibri's anonymous session to /login. */}
            <Route path="/recording/observer/:roomName" element={<RecordingObserver />} />
            {/* Loaded only by the recording-render bot's own headless Playwright browser (see
                docs/JITSI_ARCHITECTURE.md's recording-render section), never by a real signed-in
                user — deliberately outside RequireAuth, same reasoning as the observer route
                above. This bot only reads ClassroomHub traffic; it never touches the Jitsi
                IFrame API, so it has nothing in common with RecordingObserver.tsx beyond the
                "headless bot, no human ever opens this" shape. */}
            <Route path="/recording/render/:roomName" element={<RecordingRender />} />
            <Route
              path="/meet/personal"
              element={
                // Every role the "My meeting link" / Start button (PersonalMeetingButton)
                // actually appears on — staff (and teachers, for an ad-hoc parent chat
                // outside a scheduled class) who need an on-demand video room. Parent/
                // Student stay off this list — they only ever join a real scheduled class.
                <RequireAuth role="admin" also={["subadmin", "management", "coordinator", "admission", "teacher"]}>
                  <PersonalMeetingRoom />
                </RequireAuth>
              }
            />

            <Route path="/admin" element={<RequireAuth role="admin"><AppShell role="admin"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="permissions" element={<AdminPermissions />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="departments" element={<AdminDepartments />} />
              <Route path="quiz-bank" element={<AdminQuizQuestions />} />
              <Route path="activity-bank" element={<AdminActivityBank />} />
              <Route path="batches" element={<AdminBatches />} />
              <Route path="calendar" element={<AdminAcademicCalendar />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="packages" element={<AdminPackages />} />
              <Route path="payment-mapping" element={<AdminPaymentMapping />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="fee-suspension" element={<AdminFeeSuspension />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="bulk-email" element={<AdminBulkEmail />} />
              <Route path="bulk-email/history" element={<AdminBulkEmailHistory />} />
              <Route path="email-templates" element={<AdminEmailTemplates />} />
              <Route path="progress-reports" element={<AdminProgressReports />} />
              <Route path="chatbot" element={<AdminChatbot />} />
              <Route path="enrollments" element={<AdminEnrollments />} />
              <Route path="search-users" element={<AdminSearchUsers />} />
              <Route path="store-inquiries" element={<AdminStoreInquiries />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="availability" element={<AdminAvailability />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="monitoring/:serverName" element={<AdminServerDetail />} />
              <Route path="class-logs" element={<AdminClassSessionLogs />} />
            </Route>

            {/* IT Admin: a Sub Admin persona (RoleDefinition.DefaultRoute = "/itadmin"), not a
                separate backend role — reuses every one of the Admin portal's own page
                components (same idiom as /coordinator, /admission, /management below), so
                whatever modules the role is granted determines what actually shows, same as
                any other delegated portal. Only the index route differs — a distinct "Overall
                Dashboard" instead of AdminDashboard. */}
            <Route path="/itadmin" element={<RequireAuth role="itadmin"><AppShell role="itadmin"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<ItAdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="permissions" element={<AdminPermissions />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="departments" element={<AdminDepartments />} />
              <Route path="quiz-bank" element={<AdminQuizQuestions />} />
              <Route path="activity-bank" element={<AdminActivityBank />} />
              <Route path="batches" element={<AdminBatches />} />
              <Route path="calendar" element={<AdminAcademicCalendar />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="packages" element={<AdminPackages />} />
              <Route path="payment-mapping" element={<AdminPaymentMapping />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="fee-suspension" element={<AdminFeeSuspension />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="bulk-email" element={<AdminBulkEmail />} />
              <Route path="bulk-email/history" element={<AdminBulkEmailHistory />} />
              <Route path="email-templates" element={<AdminEmailTemplates />} />
              <Route path="progress-reports" element={<AdminProgressReports />} />
              <Route path="chatbot" element={<AdminChatbot />} />
              <Route path="enrollments" element={<AdminEnrollments />} />
              <Route path="search-users" element={<AdminSearchUsers />} />
              <Route path="store-inquiries" element={<AdminStoreInquiries />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="availability" element={<AdminAvailability />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="monitoring/:serverName" element={<AdminServerDetail />} />
              <Route path="class-logs" element={<AdminClassSessionLogs />} />
            </Route>

            <Route path="/teacher" element={<RequireAuth role="teacher"><AppShell role="teacher"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherMyClasses />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="recordings" element={<TeacherRecordings />} />
              <Route path="demo-feedback" element={<TeacherDemoFeedback />} />
              <Route path="doubts" element={<TeacherDoubts />} />
              <Route path="leave" element={<TeacherLeave />} />
              <Route path="payout" element={<TeacherPayout />} />
              <Route path="resources" element={<TeacherResources />} />
            </Route>

            <Route path="/parent" element={<RequireAuth role="parent"><AppShell role="parent"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<ParentDashboard />} />
              <Route path="enrollment" element={<ParentEnrollment />} />
              <Route path="schedule" element={<ParentSchedule />} />
              <Route path="resources" element={<ParentResources />} />
              <Route path="recordings" element={<ParentRecordings />} />
              <Route path="billing" element={<ParentBilling />} />
              <Route path="notifications" element={<ParentNotifications />} />
              <Route path="add-child" element={<ParentAddChild />} />
            </Route>

            {/* Subadmin/Admission/Coordinator/Management are one shared pool of pages, not 4
                separate apps — every one of these accounts is UserRole.SubAdmin on the
                backend; which RoleDefinition it's assigned only decides which of these 4 URL
                prefixes it lands on and which modules it's granted. Every non-dashboard page
                below is mounted under all 4 portals (reusing the exact same component, not a
                duplicate) so any Sub Admin-type role can reach any of them; whether one
                actually shows in a given account's sidebar is entirely a Menu Manager +
                module-grant decision (already fully dynamic), not a routing one. Each portal
                keeps its own bespoke index Dashboard and its own bespoke "reports" page
                (distinct content per persona, not interchangeable) — see App.tsx's own
                Dashboard/Reports imports above for why those aren't cross-mounted too. */}
            <Route path="/subadmin" element={<RequireAuth role="subadmin"><AppShell role="subadmin"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<SubAdminDashboard />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="class-logs" element={<SubAdminClassSessionLogs />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<SubAdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="reports" element={<SubAdminReports />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
              <Route path="bulk-email" element={<SubAdminBulkEmail />} />
              <Route path="email-templates" element={<SubAdminEmailTemplates />} />
              <Route path="chatbot" element={<SubAdminChatbot />} />
              <Route path="progress-reports" element={<SubAdminProgressReports />} />
              <Route path="search-users" element={<AdminSearchUsers />} />
              <Route path="store-inquiries" element={<SubAdminStoreInquiries />} />
              <Route path="calendar" element={<CoordinatorCalendar />} />
              <Route path="availability" element={<CoordinatorAvailability />} />
              <Route path="demo-scheduling" element={<AdmissionDemoScheduling />} />
              <Route path="demo-teacher-assignment" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-teacher-assignment/:bookingId" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-feedback" element={<AdmissionDemoFeedback />} />
              <Route path="leads" element={<AdmissionLeads />} />
              <Route path="payments" element={<AdmissionPayments />} />
              <Route path="conversion" element={<AdmissionConversion />} />
              <Route path="revenue" element={<ManagementRevenue />} />
              <Route path="performance" element={<ManagementPerformance />} />
            </Route>

            <Route path="/admission" element={<RequireAuth role="admission"><AppShell role="admission"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<AdmissionDashboard />} />
              <Route path="demo-scheduling" element={<AdmissionDemoScheduling />} />
              <Route path="demo-teacher-assignment" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-teacher-assignment/:bookingId" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-feedback" element={<AdmissionDemoFeedback />} />
              <Route path="leads" element={<AdmissionLeads />} />
              <Route path="payments" element={<AdmissionPayments />} />
              <Route path="conversion" element={<AdmissionConversion />} />
              <Route path="reports" element={<AdmissionReports />} />
              <Route path="calendar" element={<CoordinatorCalendar />} />
              <Route path="availability" element={<CoordinatorAvailability />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="class-logs" element={<SubAdminClassSessionLogs />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<SubAdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
              <Route path="bulk-email" element={<SubAdminBulkEmail />} />
              <Route path="email-templates" element={<SubAdminEmailTemplates />} />
              <Route path="chatbot" element={<SubAdminChatbot />} />
              <Route path="progress-reports" element={<SubAdminProgressReports />} />
              <Route path="search-users" element={<AdminSearchUsers />} />
              <Route path="store-inquiries" element={<SubAdminStoreInquiries />} />
              <Route path="revenue" element={<ManagementRevenue />} />
              <Route path="performance" element={<ManagementPerformance />} />
            </Route>

            <Route path="/coordinator" element={<RequireAuth role="coordinator"><AppShell role="coordinator"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<CoordinatorDashboard />} />
              <Route path="calendar" element={<CoordinatorCalendar />} />
              <Route path="availability" element={<CoordinatorAvailability />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="class-logs" element={<SubAdminClassSessionLogs />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<SubAdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
              <Route path="bulk-email" element={<SubAdminBulkEmail />} />
              <Route path="email-templates" element={<SubAdminEmailTemplates />} />
              <Route path="chatbot" element={<SubAdminChatbot />} />
              <Route path="progress-reports" element={<SubAdminProgressReports />} />
              <Route path="search-users" element={<AdminSearchUsers />} />
              <Route path="store-inquiries" element={<SubAdminStoreInquiries />} />
              <Route path="demo-scheduling" element={<AdmissionDemoScheduling />} />
              <Route path="demo-teacher-assignment" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-teacher-assignment/:bookingId" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-feedback" element={<AdmissionDemoFeedback />} />
              <Route path="leads" element={<AdmissionLeads />} />
              <Route path="payments" element={<AdmissionPayments />} />
              <Route path="conversion" element={<AdmissionConversion />} />
              <Route path="revenue" element={<ManagementRevenue />} />
              <Route path="performance" element={<ManagementPerformance />} />
            </Route>

            <Route path="/management" element={<RequireAuth role="management"><AppShell role="management"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<ManagementDashboard />} />
              <Route path="revenue" element={<ManagementRevenue />} />
              <Route path="performance" element={<ManagementPerformance />} />
              <Route path="reports" element={<ManagementReports />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<SubAdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
              <Route path="bulk-email" element={<SubAdminBulkEmail />} />
              <Route path="email-templates" element={<SubAdminEmailTemplates />} />
              <Route path="chatbot" element={<SubAdminChatbot />} />
              <Route path="progress-reports" element={<SubAdminProgressReports />} />
              <Route path="search-users" element={<AdminSearchUsers />} />
              <Route path="store-inquiries" element={<SubAdminStoreInquiries />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="class-logs" element={<SubAdminClassSessionLogs />} />
              <Route path="calendar" element={<CoordinatorCalendar />} />
              <Route path="availability" element={<CoordinatorAvailability />} />
              <Route path="demo-scheduling" element={<AdmissionDemoScheduling />} />
              <Route path="demo-teacher-assignment" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-teacher-assignment/:bookingId" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-feedback" element={<AdmissionDemoFeedback />} />
              <Route path="leads" element={<AdmissionLeads />} />
              <Route path="payments" element={<AdmissionPayments />} />
              <Route path="conversion" element={<AdmissionConversion />} />
            </Route>

            {/* The student view doubles as the parent's "what my child sees" preview. */}
            <Route path="/student" element={<RequireAuth role="student" also={["parent"]}><AppShell role="student"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<StudentDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </AppErrorBoundary>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  );
}
