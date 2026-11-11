import { Link } from "react-router-dom";
import { SolutionFeaturePage } from "./SolutionFeaturePage";

const LINK = "font-semibold text-[#C2410C] underline";

const FEATURES = [
  { title: "Enquiries become admissions", body: "Keep new enquiries, demo classes, follow-ups and enrolment in one pipeline so a promising family does not disappear inside a private message thread." },
  { title: "Batches and timetables", body: "Organise students by course and batch, schedule recurring classes, handle holidays and rescheduling, and give staff one shared academic calendar." },
  { title: "Attendance connected to class", body: "Attendance is recorded when students join the built-in live classroom. Staff review it by session and parents see their child's attendance percentage." },
  { title: "Fees, invoices and reminders", body: "Create fee plans and automatic invoices, record online, part and cash payments, send reminders and keep downloadable receipts beside the student record." },
  { title: "A portal for every role", body: "Owners, administrators, admissions staff, teachers, parents and students sign in to views designed for their work instead of sharing one spreadsheet or password." },
  { title: "Parent access from the phone", body: "Families see upcoming classes, fees, attendance, worksheets, recordings and progress from the parent app without asking your team for routine updates." },
  { title: "Live teaching tools included", body: "Run classes with video, a shared whiteboard, quizzes, learning activities, stars and recordings without buying a separate meeting tool for every teacher." },
  { title: "Homework and learning resources", body: "Share assignments, worksheets and recordings with the right batch and keep the material connected to the class where it was taught." },
  { title: "Reports for the owner", body: "Review enrolment, attendance, collections and teacher activity from the same operating data your staff use each day." },
  { title: "Start without per-student pricing", body: "Meet to Manage is priced per centre rather than per student. A free plan is available, and paid plans add the operational tools growing centres need." },
];

const FAQ = [
  ["What is coaching centre management software?", "It is one system for enquiries, admissions, batches, timetables, attendance, fees, classes, parent communication and owner reports. Meet to Manage keeps these workflows on the same student record."],
  ["Is it suitable for a small tuition or phonics academy?", "Yes. A centre can begin with the free plan and use the same platform as its student count, staff and operational needs grow. It supports single-subject academies as well as multi-course coaching centres."],
  ["Can we import our existing spreadsheet data?", "Existing student and prospect lists can be imported instead of typed again. During onboarding, your team can map the columns and verify the records before daily work moves into the platform."],
  ["Does it include live classes and automatic attendance?", "Yes. The built-in classroom includes video, whiteboard, activities and recordings. When learners join a scheduled class, attendance stays connected to that session and the parent record."],
  ["How does fee management work?", "Staff can create fee plans and invoices, record online, cash and part payments, issue receipts, review overdue balances and send reminders. Parents see their fees from their own portal or app."],
  ["Can multiple staff members use it safely?", "Yes. Owners, administrators, admissions staff, teachers, parents and students use separate role-based portals, so teams do not need to share one password or expose unrelated records."],
] as const;

export default function TuitionCentreSolution() {
  return (
    <SolutionFeaturePage
      eyebrow="Coaching and tuition centres in India"
      title="Tuition and coaching centre software for admissions, fees and attendance."
      sub="Replace registers, fee spreadsheets and scattered parent messages with one system for enquiries, classes, payments, attendance and progress."
      seo={{
        title: "Tuition Centre Management Software India | Meet to Manage",
        description: "Manage tuition centre admissions, batches, attendance, fees, live classes and parent updates in one platform. Free plan available for Indian academies.",
        path: "/solutions/tuition-centre-management-software",
      }}
      name="Tuition centre management software for India"
      features={FEATURES}
      closingHeading="One student record from enquiry to paid class"
      closing={
        <>
          Meet to Manage connects the workflows that usually sit in separate registers and apps. Explore the built-in{" "}
          <Link to="/solutions/coaching-centre-admission-crm" className={LINK}>admission CRM and demo booking</Link>,{" "}
          <Link to="/solutions/live-class-software-for-institutes" className={LINK}>live classroom</Link>,{" "}
          <Link to="/solutions/online-attendance-software-for-institutes" className={LINK}>attendance software</Link> and{" "}
          <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>. Compare the{" "}
          <Link to="/pricing" className={LINK}>plans and centre-based pricing</Link>, or start with the{" "}
          <Link to="/resources/coaching-centre-fee-tracker" className={LINK}>free fee-tracker template</Link> while you prepare your data.
        </>
      }
      faq={FAQ}
    />
  );
}
