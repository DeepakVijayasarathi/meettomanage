import { lazy, Suspense } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { Logo } from "@/components/Logo";

const MarketingHome = lazy(() => import("@/features/marketing/Home"));
const Store = lazy(() => import("@/features/marketing/Store"));
const Login = lazy(() => import("@/features/auth/Login"));
const PortalSelect = lazy(() => import("@/features/auth/PortalSelect"));
const ForgotPassword = lazy(() => import("@/features/auth/ForgotPassword"));
const ResetPin = lazy(() => import("@/features/auth/ResetPin"));
const NotFound = lazy(() => import("@/features/auth/NotFound"));

const AdminDashboard = lazy(() => import("@/features/admin/Dashboard"));
const AdminUsers = lazy(() => import("@/features/admin/Users"));
const AdminPermissions = lazy(() => import("@/features/admin/Permissions"));
const AdminCourses = lazy(() => import("@/features/admin/Courses"));
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
const AdminEmailTemplates = lazy(() => import("@/features/admin/EmailTemplates"));
const AdminProgressReports = lazy(() => import("@/features/admin/ProgressReports"));
const AdminEnrollments = lazy(() => import("@/features/admin/Enrollments"));
const AdminStoreInquiries = lazy(() => import("@/features/admin/StoreInquiries"));
const AdminSettings = lazy(() => import("@/features/admin/Settings"));

const TeacherDashboard = lazy(() => import("@/features/teacher/Dashboard"));
const TeacherMyClasses = lazy(() => import("@/features/teacher/MyClasses"));
const TeacherAttendance = lazy(() => import("@/features/teacher/Attendance"));
const TeacherDemoFeedback = lazy(() => import("@/features/teacher/DemoFeedback"));
const TeacherLeave = lazy(() => import("@/features/teacher/Leave"));
const TeacherPayout = lazy(() => import("@/features/teacher/Payout"));
const TeacherResources = lazy(() => import("@/features/teacher/Resources"));

const ParentDashboard = lazy(() => import("@/features/parent/Dashboard"));
const ParentEnrollment = lazy(() => import("@/features/parent/Enrollment"));
const ParentSchedule = lazy(() => import("@/features/parent/Schedule"));
const ParentResources = lazy(() => import("@/features/parent/Resources"));
const ParentRecordings = lazy(() => import("@/features/parent/Recordings"));
const ParentBilling = lazy(() => import("@/features/parent/Billing"));
const ParentNotifications = lazy(() => import("@/features/parent/Notifications"));
const ParentAddChild = lazy(() => import("@/features/parent/AddChild"));

const LiveClassroom = lazy(() => import("@/features/classroom/LiveClassroom"));

const SubAdminDashboard = lazy(() => import("@/features/subadmin/Dashboard"));
const SubAdminPermissions = lazy(() => import("@/features/subadmin/Permissions"));
const SubAdminIntegrations = lazy(() => import("@/features/subadmin/Integrations"));
const SubAdminReports = lazy(() => import("@/features/subadmin/Reports"));
const SubAdminAuditLog = lazy(() => import("@/features/subadmin/AuditLog"));

const AdmissionDashboard = lazy(() => import("@/features/admission/Dashboard"));
const AdmissionDemoScheduling = lazy(() => import("@/features/admission/DemoScheduling"));
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
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<MarketingHome />} />
            <Route path="/store" element={<Store />} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal-select" element={<PortalSelect />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
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

            <Route path="/admin" element={<RequireAuth role="admin"><AppShell role="admin"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="permissions" element={<AdminPermissions />} />
              <Route path="courses" element={<AdminCourses />} />
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
              <Route path="email-templates" element={<AdminEmailTemplates />} />
              <Route path="progress-reports" element={<AdminProgressReports />} />
              <Route path="enrollments" element={<AdminEnrollments />} />
              <Route path="store-inquiries" element={<AdminStoreInquiries />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            <Route path="/teacher" element={<RequireAuth role="teacher"><AppShell role="teacher"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherMyClasses />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="demo-feedback" element={<TeacherDemoFeedback />} />
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

            <Route path="/subadmin" element={<RequireAuth role="subadmin"><AppShell role="subadmin"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<SubAdminDashboard />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="reports" element={<SubAdminReports />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
            </Route>

            <Route path="/admission" element={<RequireAuth role="admission"><AppShell role="admission"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<AdmissionDashboard />} />
              <Route path="demo-scheduling" element={<AdmissionDemoScheduling />} />
              <Route path="demo-feedback" element={<AdmissionDemoFeedback />} />
              <Route path="leads" element={<AdmissionLeads />} />
              <Route path="payments" element={<AdmissionPayments />} />
              <Route path="conversion" element={<AdmissionConversion />} />
              <Route path="reports" element={<AdmissionReports />} />
            </Route>

            <Route path="/coordinator" element={<RequireAuth role="coordinator"><AppShell role="coordinator"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<CoordinatorDashboard />} />
              <Route path="calendar" element={<CoordinatorCalendar />} />
              <Route path="availability" element={<CoordinatorAvailability />} />
            </Route>

            <Route path="/management" element={<RequireAuth role="management"><AppShell role="management"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<ManagementDashboard />} />
              <Route path="revenue" element={<ManagementRevenue />} />
              <Route path="performance" element={<ManagementPerformance />} />
              <Route path="reports" element={<ManagementReports />} />
            </Route>

            {/* The student view doubles as the parent's "what my child sees" preview. */}
            <Route path="/student" element={<RequireAuth role="student" also={["parent"]}><AppShell role="student"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<StudentDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  );
}
