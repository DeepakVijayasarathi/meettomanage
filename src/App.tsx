import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MarketingTranslationLayer } from "@/components/MarketingTranslationLayer";
import { Toaster } from "@/components/ui/toaster";
import { RequireAuth } from "@/components/RequireAuth";
// The home page is the most visited route: importing it statically puts it in the first download instead of
// behind a second request chain (entry -> route chunk -> its dependencies).
import MarketingHome from "@/features/marketing/Home";
import { BrandLoader } from "@/components/BrandLoader";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { tenantPath } from "@/lib/tenantPath";
const PlatformTenants = lazy(() => import("@/features/platform/Tenants"));
const PlatformMenus = lazy(() => import("@/features/platform/Menus"));
const PlatformConfiguration = lazy(() => import("@/features/platform/Configuration"));
const PlatformEmailMappings = lazy(() => import("@/features/platform/EmailMappings"));
const PlatformPlans = lazy(() => import("@/features/platform/Plans"));
const PlatformSubscriptions = lazy(() => import("@/features/platform/Subscriptions"));
const PlatformRevenue = lazy(() => import("@/features/platform/Revenue"));
const PlatformReminders = lazy(() => import("@/features/platform/Reminders"));
const PlatformAuditLog = lazy(() => import("@/features/platform/AuditLog"));
const PlatformOperations = lazy(() => import("@/features/platform/Operations"));
const AdminSubscription = lazy(() => import("@/features/admin/Subscription"));
const Signup = lazy(() => import("@/features/public/Signup"));

const Store = lazy(() => import("@/features/marketing/Store"));
const Demo = lazy(() => import("@/features/marketing/Demo"));
const GetStarted = lazy(() => import("@/features/marketing/GetStarted"));
const Pricing = lazy(() => import("@/features/marketing/Pricing"));
const BlogList = lazy(() => import("@/features/marketing/BlogList"));
const BlogPost = lazy(() => import("@/features/marketing/BlogPost"));
// Portal chrome is only needed once someone is signed in, so it stays out of the marketing visitor's bundle.
const AppShell = lazy(() => import("@/components/AppShell").then((m) => ({ default: m.AppShell })));
const MarketingShell = lazy(() => import("@/features/marketingConsole/MarketingShell").then((m) => ({ default: m.MarketingShell })));
const ViewAsBanner = lazy(() => import("@/components/ViewAsBanner").then((m) => ({ default: m.ViewAsBanner })));
const PrivacyPolicy = lazy(() => import("@/features/marketing/PrivacyPolicy"));
const Login = lazy(() => import("@/features/auth/Login"));
const PortalSelect = lazy(() => import("@/features/auth/PortalSelect"));
const ForgotPin = lazy(() => import("@/features/auth/ForgotPin"));
// Marketing console (Marketing role only, own login) — the platform owner's marketing-site admin,
// kept out of every academy portal.
const MarketingLogin = lazy(() => import("@/features/marketingConsole/MarketingLogin"));
const MarketingDashboard = lazy(() => import("@/features/marketingConsole/MarketingDashboard"));
const MarketingSeo = lazy(() => import("@/features/marketingConsole/MarketingSeo"));
const MarketingAnalytics = lazy(() => import("@/features/marketingConsole/MarketingAnalytics"));
const MarketingDemoRequests = lazy(() => import("@/features/admin/DemoRequests"));
const MarketingChats = lazy(() => import("@/features/marketingConsole/MarketingChats"));
const MarketingVisitors = lazy(() => import("@/features/marketingConsole/MarketingVisitors"));
const MarketingJourneys = lazy(() => import("@/features/marketingConsole/MarketingJourneys"));
const MarketingVisitorDetail = lazy(() => import("@/features/marketingConsole/MarketingVisitorDetail"));
const MarketingBlogPosts = lazy(() => import("@/features/admin/BlogPosts"));
const ResetPin = lazy(() => import("@/features/auth/ResetPin"));
const NotFound = lazy(() => import("@/features/auth/NotFound"));
const AdmissionPayment = lazy(() => import("@/features/public/AdmissionPayment"));
const Terms = lazy(() => import("@/features/public/Terms"));
const Customers = lazy(() => import("@/features/marketing/Customers"));
const CaseStudyReaderNest = lazy(() => import("@/features/marketing/CaseStudyReaderNest"));
const CaseStudyAlphabet = lazy(() => import("@/features/marketing/CaseStudyAlphabet"));
const ResourceLibrary = lazy(() => import("@/features/marketing/resources/ResourcePages").then(m => ({ default: m.ResourceLibrary })));
const FeeTrackerGuide = lazy(() => import("@/features/marketing/resources/ResourcePages").then(m => ({ default: m.FeeTrackerGuide })));
const TeacherHandoverGuide = lazy(() => import("@/features/marketing/resources/ResourcePages").then(m => ({ default: m.TeacherHandoverGuide })));
const FreeGames = lazy(() => import("@/features/marketing/games/FreeGames"));
const AlphabetGamePage = lazy(() => import("@/features/marketing/games/FreeGames").then(m => ({ default: m.AlphabetGamePage })));
const PhonicsGamePage = lazy(() => import("@/features/marketing/games/FreeGames").then(m => ({ default: m.PhonicsGamePage })));
const WordSoundsGamePage = lazy(() => import("@/features/marketing/games/FreeGames").then(m => ({ default: m.WordSoundsGamePage })));
const Careers = lazy(() => import("@/features/marketing/Careers"));
const Docs = lazy(() => import("@/features/marketing/Docs"));
const NICHE_SLUGS = ["english-grammar-class-software", "art-class-software", "yoga-class-software", "abacus-class-software"];
const NichePages = NICHE_SLUGS.map((_, i) => lazy(() => import("@/features/marketing/NicheSolutions").then((m) => ({ default: m.NICHE_ROUTES[i].Page }))));
const ClassplusAlternative = lazy(() => import("@/features/marketing/ClassplusAlternative"));
const LiveClassSolution = lazy(() => import("@/features/marketing/LiveClassSolution"));
const AttendanceSolution = lazy(() => import("@/features/marketing/AttendanceSolution"));
const FeeManagementSolution = lazy(() => import("@/features/marketing/FeeManagementSolution"));
const PhonicsSolution = lazy(() => import("@/features/marketing/PhonicsSolution"));
const PlatformTerms = lazy(() => import("@/features/marketing/PlatformTerms"));
const PlatformPrivacy = lazy(() => import("@/features/marketing/PlatformPrivacy"));

const AdminDashboard = lazy(() => import("@/features/admin/Dashboard"));
const FounderDashboard = lazy(() => import("@/features/founder/Dashboard"));
const AdminUsers = lazy(() => import("@/features/admin/Users"));
const AdminPermissions = lazy(() => import("@/features/admin/Permissions"));
const AdminCourses = lazy(() => import("@/features/admin/Courses"));
const AdminDepartments = lazy(() => import("@/features/admin/Departments"));
const AdminQuizQuestions = lazy(() => import("@/features/admin/QuizQuestions"));
const AdminActivityBank = lazy(() => import("@/features/admin/ActivityBank"));
const LearningPlugins = lazy(() => import("@/features/shared/LearningPlugins"));
const AdminBatches = lazy(() => import("@/features/admin/Batches"));
const AdminAcademicCalendar = lazy(() => import("@/features/admin/AcademicCalendar"));
const AdminSessions = lazy(() => import("@/features/admin/Sessions"));
const AdminRecordings = lazy(() => import("@/features/admin/Recordings"));
const AdminResources = lazy(() => import("@/features/admin/Resources"));
const AdminBilling = lazy(() => import("@/features/admin/Billing"));
const AdminPackages = lazy(() => import("@/features/admin/Packages"));
const AdminPaymentMapping = lazy(() => import("@/features/admin/PaymentMapping"));
const AdminPayouts = lazy(() => import("@/features/admin/Payouts"));
const AdminFeeSuspension = lazy(() => import("@/features/admin/FeeSuspension"));
const AdminReports = lazy(() => import("@/features/admin/Reports"));
const ParentFeedbackReport = lazy(() => import("@/features/admin/ParentFeedback"));
const SupportTicketsQueue = lazy(() => import("@/features/admin/SupportTickets"));
const PayoutApprovals = lazy(() => import("@/features/admin/PayoutApprovals"));
const StaffMyLeave = lazy(() => import("@/features/subadmin/MyLeave"));
const AdminStaffLeave = lazy(() => import("@/features/admin/StaffLeave"));
const StaffMySalary = lazy(() => import("@/features/subadmin/MySalary"));
const AdminStaffPayroll = lazy(() => import("@/features/admin/StaffPayroll"));
const ParentSupport = lazy(() => import("@/features/parent/Support"));
const AdminBulkEmail = lazy(() => import("@/features/admin/BulkEmail"));
const AdminBulkEmailHistory = lazy(() => import("@/features/admin/BulkEmailHistory"));
const AdminEmailTemplates = lazy(() => import("@/features/admin/EmailTemplates"));
const AdminProgressReports = lazy(() => import("@/features/admin/ProgressReports"));
const AdminChatbot = lazy(() => import("@/features/admin/ChatbotAdmin"));
const AdminAiInsights = lazy(() => import("@/features/admin/AiInsights"));
const AdminEnrollments = lazy(() => import("@/features/admin/Enrollments"));
const AdminSearchUsers = lazy(() => import("@/features/admin/SearchUsers"));
const AdminStoreInquiries = lazy(() => import("@/features/admin/StoreInquiries"));
const AdminLeave = lazy(() => import("@/features/admin/Leave"));
const AdminAvailability = lazy(() => import("@/features/admin/Availability"));
const AdminSettings = lazy(() => import("@/features/admin/Settings"));
const AdminMonitoring = lazy(() => import("@/features/admin/Monitoring"));
const AdminNetworkAlerts = lazy(() => import("@/features/admin/NetworkAlerts"));
const AdminServerDetail = lazy(() => import("@/features/admin/ServerDetail"));
const AdminClassSessionLogs = lazy(() => import("@/features/admin/ClassSessionLogs"));

const ItAdminDashboard = lazy(() => import("@/features/itadmin/Dashboard"));

const TeacherDashboard = lazy(() => import("@/features/teacher/Dashboard"));
const TeacherMyClasses = lazy(() => import("@/features/teacher/MyClasses"));
const TeacherStudents = lazy(() => import("@/features/teacher/Students"));
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
const StaffLiveClassroom = lazy(() => import("@/features/classroom/StaffLiveClassroom"));
const PersonalMeetingRoom = lazy(() => import("@/features/classroom/PersonalMeetingRoom"));
const RecordingObserver = lazy(() => import("@/features/classroom/RecordingObserver"));
const GuestJoin = lazy(() => import("@/features/public/GuestJoin"));
const ViewAsHandoff = lazy(() => import("@/features/public/ViewAsHandoff"));
const PersonalRoomGuestJoin = lazy(() => import("@/features/public/PersonalRoomGuestJoin"));

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
const Mito = lazy(() => import("@/features/student/Mito"));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <BrandLoader />
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <BrowserRouter basename={tenantPath() || undefined}>
        <AppErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/platform/tenants" element={<PlatformTenants />} />
            <Route path="/platform" element={<Navigate to="/platform/tenants" replace />} />
            <Route path="/platform/menus" element={<PlatformMenus />} />
            <Route path="/platform/configuration" element={<PlatformConfiguration />} />
            <Route path="/platform/email-mappings" element={<PlatformEmailMappings />} />
            <Route path="/platform/plans" element={<PlatformPlans />} />
            <Route path="/platform/subscriptions" element={<PlatformSubscriptions />} />
            <Route path="/platform/revenue" element={<PlatformRevenue />} />
            <Route path="/platform/reminders" element={<PlatformReminders />} />
            <Route path="/platform/audit-log" element={<PlatformAuditLog />} />
            <Route path="/platform/operations" element={<PlatformOperations />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/" element={<MarketingTranslationLayer><MarketingHome /></MarketingTranslationLayer>} />
            <Route path="/store" element={<MarketingTranslationLayer><Store /></MarketingTranslationLayer>} />
            <Route path="/demo" element={<MarketingTranslationLayer><Demo /></MarketingTranslationLayer>} />
            <Route path="/get-started" element={<MarketingTranslationLayer><GetStarted /></MarketingTranslationLayer>} />
            <Route path="/pricing" element={<MarketingTranslationLayer><Pricing /></MarketingTranslationLayer>} />
            <Route path="/blog" element={<MarketingTranslationLayer><BlogList /></MarketingTranslationLayer>} />
            <Route path="/blog/:slug" element={<MarketingTranslationLayer><BlogPost /></MarketingTranslationLayer>} />
            <Route path="/policy" element={<MarketingTranslationLayer><PrivacyPolicy /></MarketingTranslationLayer>} />
            <Route path="/customers" element={<MarketingTranslationLayer><Customers /></MarketingTranslationLayer>} />
            <Route path="/customers/the-reader-nest" element={<MarketingTranslationLayer><CaseStudyReaderNest /></MarketingTranslationLayer>} />
            <Route path="/customers/alphabet" element={<MarketingTranslationLayer><CaseStudyAlphabet /></MarketingTranslationLayer>} />
            <Route path="/resources" element={<MarketingTranslationLayer><ResourceLibrary /></MarketingTranslationLayer>} />
            <Route path="/resources/coaching-centre-fee-tracker" element={<MarketingTranslationLayer><FeeTrackerGuide /></MarketingTranslationLayer>} />
            <Route path="/resources/teacher-handover-checklist" element={<MarketingTranslationLayer><TeacherHandoverGuide /></MarketingTranslationLayer>} />
            <Route path="/free-games" element={<MarketingTranslationLayer><FreeGames /></MarketingTranslationLayer>} />
            <Route path="/free-games/alphabet" element={<MarketingTranslationLayer><AlphabetGamePage /></MarketingTranslationLayer>} />
            <Route path="/free-games/phonics" element={<MarketingTranslationLayer><PhonicsGamePage /></MarketingTranslationLayer>} />
            <Route path="/free-games/word-sounds" element={<MarketingTranslationLayer><WordSoundsGamePage /></MarketingTranslationLayer>} />
            <Route path="/solutions/live-class-software-for-institutes" element={<MarketingTranslationLayer><LiveClassSolution /></MarketingTranslationLayer>} />
            <Route path="/solutions/online-attendance-software-for-institutes" element={<MarketingTranslationLayer><AttendanceSolution /></MarketingTranslationLayer>} />
            <Route path="/solutions/fee-management-software-for-coaching-centres" element={<MarketingTranslationLayer><FeeManagementSolution /></MarketingTranslationLayer>} />
            <Route path="/solutions/phonics-live-class-software" element={<MarketingTranslationLayer><PhonicsSolution /></MarketingTranslationLayer>} />
            <Route path="/docs" element={<MarketingTranslationLayer><Docs /></MarketingTranslationLayer>} />
            <Route path="/alternatives/classplus-alternative-for-coaching-centres" element={<MarketingTranslationLayer><ClassplusAlternative /></MarketingTranslationLayer>} />
            {NICHE_SLUGS.map((slug, i) => { const Page = NichePages[i]; return <Route key={slug} path={`/solutions/${slug}`} element={<MarketingTranslationLayer><Page /></MarketingTranslationLayer>} />; })}
            <Route path="/careers" element={<MarketingTranslationLayer><Careers /></MarketingTranslationLayer>} />
            <Route path="/privacy" element={<MarketingTranslationLayer><PlatformPrivacy /></MarketingTranslationLayer>} />
            <Route path="/legal/terms" element={<MarketingTranslationLayer><PlatformTerms /></MarketingTranslationLayer>} />
            <Route path="/login" element={<Login />} />
            <Route path="/portal-select" element={<PortalSelect />} />
            <Route path="/forgot-pin" element={<ForgotPin />} />
            {/* Legacy path, kept as a redirect for old bookmarks/links. */}
            <Route path="/forgot-password" element={<Navigate to="/forgot-pin" replace />} />
            <Route path="/reset-pin" element={<ResetPin />} />
            {/* Anonymous payment page behind an admission counsellor's payment link (T&C first). */}
            <Route path="/pay/:token" element={<AdmissionPayment />} />
            {/* Full Terms & Conditions and Refund Policy, linked from every payment screen. */}
            <Route path="/terms" element={<Terms />} />

            {/* Immersive, full-screen classroom — rendered outside the portal shell */}
            {/* Admin-team monitor view of a live class (Join Class from Sessions/Calendar) — the
                embedded classroom instead of a raw Jitsi tab; see StaffLiveClassroom.tsx. */}
            <Route
              path="/staff/live/:sessionId"
              element={
                <RequireAuth role="admin" also={["subadmin", "management", "coordinator", "admission", "itadmin", "executive"]}>
                  <StaffLiveClassroom />
                </RequireAuth>
              }
            />
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
            {/* "Copy Guest Link" bridge page (RM/Admin/Coordinator Sessions and Calendar
                screens) — a caretaker opening a copied link never logs in, so this has to sit
                outside RequireAuth the same way the Jibri route above does; see GuestJoin.tsx's
                own doc comment for why it hands off to raw Jitsi rather than the in-app classroom. */}
            <Route path="/guest-join" element={<GuestJoin />} />
            {/* The new tab a Relationship Manager's "View as parent" opens (lib/viewAs.ts) —
                it receives its read-only session from the opener, so no login here either. */}
            <Route path="/view-as" element={<ViewAsHandoff />} />
            {/* A Personal Meeting Room's invite link (UsersController.MyMeetingRoomShortLink) --
                same reasoning as /guest-join just above: a caretaker/guest opening a shared link
                never logs in, so this sits outside RequireAuth too. */}
            <Route path="/join/personal/:ownerId" element={<PersonalRoomGuestJoin />} />
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
              <Route path="learning-plugins" element={<LearningPlugins />} />
              <Route path="batches" element={<AdminBatches />} />
              <Route path="calendar" element={<AdminAcademicCalendar />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="recordings" element={<AdminRecordings />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="packages" element={<AdminPackages />} />
              <Route path="subscription" element={<AdminSubscription />} />
              <Route path="payment-mapping" element={<AdminPaymentMapping />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="payout-approvals" element={<PayoutApprovals />} />
              <Route path="fee-suspension" element={<AdminFeeSuspension />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="bulk-email" element={<AdminBulkEmail />} />
              <Route path="bulk-email/history" element={<AdminBulkEmailHistory />} />
              <Route path="email-templates" element={<AdminEmailTemplates />} />
              <Route path="progress-reports" element={<AdminProgressReports />} />
              <Route path="chatbot" element={<AdminChatbot />} />
              <Route path="ai-insights" element={<AdminAiInsights />} />
              <Route path="enrollments" element={<AdminEnrollments />} />
              <Route path="leads" element={<AdmissionLeads />} />
              <Route path="demo-scheduling" element={<AdmissionDemoScheduling />} />
              <Route path="search-users" element={<AdminSearchUsers />} />
              <Route path="store-inquiries" element={<AdminStoreInquiries />} />
              <Route path="parent-feedback" element={<ParentFeedbackReport />} />
              <Route path="support-tickets" element={<SupportTicketsQueue />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="staff-leave" element={<AdminStaffLeave />} />
              <Route path="my-leave" element={<StaffMyLeave approverLabel="Management" />} />
              <Route path="my-salary" element={<StaffMySalary />} />
              <Route path="staff-payroll" element={<AdminStaffPayroll />} />
              <Route path="availability" element={<AdminAvailability />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="monitoring/network-alerts" element={<AdminNetworkAlerts />} />
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
              <Route path="recordings" element={<AdminRecordings />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="packages" element={<AdminPackages />} />
              <Route path="payment-mapping" element={<AdminPaymentMapping />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="payout-approvals" element={<PayoutApprovals />} />
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
              <Route path="parent-feedback" element={<ParentFeedbackReport />} />
              <Route path="support-tickets" element={<SupportTicketsQueue />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="availability" element={<AdminAvailability />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="monitoring/network-alerts" element={<AdminNetworkAlerts />} />
              <Route path="monitoring/:serverName" element={<AdminServerDetail />} />
              <Route path="class-logs" element={<AdminClassSessionLogs />} />
            </Route>

            <Route path="/marketing/login" element={<MarketingLogin />} />
            <Route path="/marketing" element={<RequireAuth role="marketing"><MarketingShell><Outlet /></MarketingShell></RequireAuth>}>
              <Route index element={<MarketingDashboard />} />
              <Route path="demo-requests" element={<MarketingDemoRequests />} />
              <Route path="chats" element={<MarketingChats />} />
              <Route path="visitors" element={<MarketingVisitors />} />
              <Route path="journeys" element={<MarketingJourneys />} />
              <Route path="journeys/:visitorId" element={<MarketingVisitorDetail />} />
              <Route path="blog-posts" element={<MarketingBlogPosts />} />
              <Route path="seo" element={<MarketingSeo />} />
              <Route path="tracking" element={<MarketingAnalytics />} />
            </Route>

            {/* Founder Dashboard ("executive"): a Sub Admin persona (RoleDefinition
                "admin-management", DefaultRoute = "/executive") — Founder = Management Dashboard +
                Admin Dashboard on one login, renamed from "Admin & Management" 2026-09-22.
                /admin and /management stay live (existing staff on those aren't moved), but the
                Founder never needs to switch between them: this mounts every Admin page plus the
                Management pages, with a single merged FounderDashboard landing page instead of two
                separate dashboards. The sidebar (DB menu rows gated by module) decides what
                actually shows, so narrowing it is a Roles & Permissions edit. */}
            <Route path="/executive" element={<RequireAuth role="executive"><AppShell role="executive"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<FounderDashboard />} />
              {/* "/executive/overview" (ManagementDashboard) merged into the index page above
                  2026-09-22 — redirect rather than 404 for anyone with the old link bookmarked. */}
              <Route path="overview" element={<Navigate to="/executive" replace />} />
              <Route path="revenue" element={<ManagementRevenue />} />
              <Route path="performance" element={<ManagementPerformance />} />
              <Route path="management-reports" element={<ManagementReports />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="permissions" element={<AdminPermissions />} />
              <Route path="courses" element={<AdminCourses />} />
              <Route path="departments" element={<AdminDepartments />} />
              <Route path="quiz-bank" element={<AdminQuizQuestions />} />
              <Route path="activity-bank" element={<AdminActivityBank />} />
              <Route path="batches" element={<AdminBatches />} />
              <Route path="calendar" element={<AdminAcademicCalendar />} />
              <Route path="sessions" element={<AdminSessions />} />
              <Route path="recordings" element={<AdminRecordings />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="billing" element={<AdminBilling />} />
              <Route path="packages" element={<AdminPackages />} />
              <Route path="payment-mapping" element={<AdminPaymentMapping />} />
              <Route path="payouts" element={<AdminPayouts />} />
              <Route path="payout-approvals" element={<PayoutApprovals />} />
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
              <Route path="parent-feedback" element={<ParentFeedbackReport />} />
              <Route path="support-tickets" element={<SupportTicketsQueue />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="staff-leave" element={<AdminStaffLeave />} />
              <Route path="my-leave" element={<StaffMyLeave approverLabel="Management" />} />
              <Route path="my-salary" element={<StaffMySalary />} />
              <Route path="staff-payroll" element={<AdminStaffPayroll />} />
              <Route path="availability" element={<AdminAvailability />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="monitoring" element={<AdminMonitoring />} />
              <Route path="monitoring/network-alerts" element={<AdminNetworkAlerts />} />
              <Route path="monitoring/:serverName" element={<AdminServerDetail />} />
              <Route path="class-logs" element={<AdminClassSessionLogs />} />
            </Route>

            <Route path="/teacher" element={<RequireAuth role="teacher"><AppShell role="teacher"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherMyClasses />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="recordings" element={<TeacherRecordings />} />
              <Route path="demo-feedback" element={<TeacherDemoFeedback />} />
              <Route path="doubts" element={<TeacherDoubts />} />
              <Route path="leave" element={<TeacherLeave />} />
              <Route path="payout" element={<TeacherPayout />} />
              <Route path="resources" element={<TeacherResources />} />
              <Route path="learning-plugins" element={<LearningPlugins />} />
            </Route>

            <Route path="/parent" element={<RequireAuth role="parent"><AppShell role="parent"><Outlet /></AppShell></RequireAuth>}>
              <Route index element={<ParentDashboard />} />
              <Route path="enrollment" element={<ParentEnrollment />} />
              <Route path="schedule" element={<ParentSchedule />} />
              <Route path="resources" element={<ParentResources />} />
              <Route path="recordings" element={<ParentRecordings />} />
              <Route path="billing" element={<ParentBilling />} />
              <Route path="notifications" element={<ParentNotifications />} />
              <Route path="support" element={<ParentSupport />} />
              <Route path="add-child" element={<ParentAddChild />} />
              <Route path="mito" element={<Mito />} />
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
              <Route path="recordings" element={<AdminRecordings />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="class-logs" element={<SubAdminClassSessionLogs />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="my-leave" element={<StaffMyLeave />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="my-salary" element={<StaffMySalary />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="support-tickets" element={<SupportTicketsQueue />} />
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
              <Route path="recordings" element={<AdminRecordings />} />
              <Route path="demo-scheduling" element={<AdmissionDemoScheduling />} />
              <Route path="demo-teacher-assignment" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-teacher-assignment/:bookingId" element={<AdmissionDemoTeacherAssignment />} />
              <Route path="demo-feedback" element={<AdmissionDemoFeedback />} />
              <Route path="leads" element={<AdmissionLeads />} />
              <Route path="payments" element={<AdmissionPayments />} />
              <Route path="conversion" element={<AdmissionConversion />} />
              <Route path="reports" element={<AdmissionReports />} />
              <Route path="parent-feedback" element={<ParentFeedbackReport />} />
              <Route path="calendar" element={<CoordinatorCalendar />} />
              <Route path="availability" element={<CoordinatorAvailability />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="class-logs" element={<SubAdminClassSessionLogs />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="my-leave" element={<StaffMyLeave />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="my-salary" element={<StaffMySalary />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
              <Route path="support-tickets" element={<SupportTicketsQueue />} />
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
              <Route path="recordings" element={<AdminRecordings />} />
              <Route path="calendar" element={<CoordinatorCalendar />} />
              <Route path="availability" element={<CoordinatorAvailability />} />
              <Route path="permissions" element={<SubAdminPermissions />} />
              <Route path="integrations" element={<SubAdminIntegrations />} />
              <Route path="class-logs" element={<SubAdminClassSessionLogs />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="my-leave" element={<StaffMyLeave />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="my-salary" element={<StaffMySalary />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
              <Route path="support-tickets" element={<SupportTicketsQueue />} />
              <Route path="reports" element={<SubAdminReports />} />
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
              <Route path="recordings" element={<AdminRecordings />} />
              <Route path="revenue" element={<ManagementRevenue />} />
              <Route path="performance" element={<ManagementPerformance />} />
              <Route path="reports" element={<ManagementReports />} />
              <Route path="batches" element={<SubAdminBatches />} />
              <Route path="sessions" element={<SubAdminSessions />} />
              <Route path="my-leave" element={<StaffMyLeave />} />
              <Route path="leave" element={<AdminLeave />} />
              <Route path="my-salary" element={<StaffMySalary />} />
              <Route path="staff-payroll" element={<AdminStaffPayroll />} />
              <Route path="payout-approvals" element={<PayoutApprovals />} />
              <Route path="payouts" element={<SubAdminPayouts />} />
              <Route path="billing" element={<SubAdminBilling />} />
              <Route path="enrollments" element={<SubAdminEnrollments />} />
              <Route path="fee-suspension" element={<SubAdminFeeSuspension />} />
              <Route path="payment-mapping" element={<SubAdminPaymentMapping />} />
              <Route path="courses" element={<SubAdminCourses />} />
              <Route path="departments" element={<SubAdminDepartments />} />
              <Route path="quiz-bank" element={<SubAdminQuizQuestions />} />
              <Route path="activity-bank" element={<SubAdminActivityBank />} />
              <Route path="resources" element={<AdminResources />} />
              <Route path="packages" element={<SubAdminPackages />} />
              <Route path="users" element={<SubAdminUsers />} />
              <Route path="audit-log" element={<SubAdminAuditLog />} />
              <Route path="support-tickets" element={<SupportTicketsQueue />} />
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
              <Route path="mito" element={<Mito />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </AppErrorBoundary>
      </BrowserRouter>
      <Toaster />
      <Suspense fallback={null}>
        <ViewAsBanner />
      </Suspense>
    </TooltipProvider>
  );
}
