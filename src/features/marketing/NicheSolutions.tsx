import { Link } from "react-router-dom";
import { SolutionFeaturePage, type SolutionFeature } from "./SolutionFeaturePage";

const LINK = "font-semibold text-[#C2410C] underline";

/** Shared by every subject page below. Each line is a shipped feature of the live classroom, attendance, billing or parent app. */
const COMMON: SolutionFeature[] = [
  { title: "A waiting room you control", body: "Admit students one by one, and see who is in the class and who has a hand raised." },
  { title: "One-to-one and group classes", body: "Run small groups and individual sessions on the same platform. Every member also has a permanent meeting room with a short invite link." },
  { title: "Recordings students can replay", body: "Classes can be recorded and replayed from the parent app for the retention period of your plan." },
  { title: "Attendance without a register", body: "Attendance is recorded when a student opens their class link, so there is nothing to fill in afterwards." },
  { title: "Fees handled for you", body: "Invoices and reminders are created automatically, and families pay online from the parent app." },
  { title: "A parent app for every family", body: "Parents see the next class and join with one tap, with no separate links or WhatsApp messages to chase." },
];

interface Niche {
  slug: string;
  eyebrow: string;
  title: string;
  sub: string;
  seoTitle: string;
  seoDescription: string;
  name: string;
  specific: SolutionFeature[];
  closingHeading: string;
  closing: string;
  faq?: readonly (readonly [question: string, answer: string])[];
}

const NICHES: Niche[] = [
  {
    slug: "english-grammar-class-software",
    eyebrow: "For English and grammar teachers",
    title: "Online class software for English grammar and spoken English teachers.",
    sub: "Teach grammar live with a shared whiteboard, slides and quizzes, and keep attendance, fees and the parent app in the same place.",
    seoTitle: "Online English Grammar Class Software | Meet to Manage",
    seoDescription: "Teach English grammar and spoken English online with a shared whiteboard, slides, live quizzes and recordings. Attendance, fees and a parent app are built in.",
    name: "Online class software for English grammar teachers",
    specific: [
      { title: "A shared whiteboard for sentences", body: "Write, underline and correct sentences together on a board the whole class sees." },
      { title: "Present your lesson slides", body: "Present slides in the live class and mark them up as you teach." },
      { title: "Live grammar quizzes", body: "Launch questions from a reusable quiz bank and reward answers with stars and a leaderboard." },
      { title: "Games and resources for English", body: "The learning catalogue includes English Grammar, Vocabulary Building, Spoken English, Phonetics and Public Speaking, ready to use in class." },
    ],
    closingHeading: "Built for language teachers",
    closing: "Teaching phonics as well? See our phonics class software.",
  },
  {
    slug: "art-class-software",
    eyebrow: "Art class management for creative teachers",
    title: "Art class management software for scheduling, registration and live teaching.",
    sub: "Manage drawing, painting and craft registrations, class schedules, attendance and fees, then teach live with video, a shared drawing board and recordings.",
    seoTitle: "Art Class Management & Scheduling Software | Meet to Manage",
    seoDescription: "Manage art class registration, schedules, attendance and fees, then teach drawing, painting and craft live with video, whiteboard and recordings.",
    name: "Art class management and scheduling software",
    specific: [
      { title: "Art class registration in one record", body: "Keep each enquiry, demo, enrolment and family contact together instead of copying registration details between forms, messages and spreadsheets." },
      { title: "Schedule group and private lessons", body: "Plan recurring batches and one-to-one lessons, handle rescheduling, and give teachers and families one view of upcoming art classes." },
      { title: "Live video of the work", body: "Students switch their camera on so you can see paper, brush and craft work as it happens." },
      { title: "A shared drawing board", body: "Sketch examples on the whiteboard, and open it full screen when a lesson needs the space." },
      { title: "Present references", body: "Present your screen to show reference images, slides or a finished piece." },
      { title: "Art resources in the catalogue", body: "The learning catalogue includes Drawing, Painting, Colouring, Origami, Craft Work, Calligraphy and Clay Modelling, ready to use in class." },
    ],
    closingHeading: "Built for creative classes",
    closing: "Recordings let students replay a technique after class.",
    faq: [
      ["What does art class management software handle?", "It keeps enquiries, registrations, schedules, attendance, fees, live classes, recordings and family updates connected to the same student record."],
      ["Can I schedule both group art classes and private lessons?", "Yes. You can schedule recurring group batches and one-to-one sessions, then manage changes from the same calendar."],
      ["Can students show their artwork during an online class?", "Yes. Students can use live video while the teacher demonstrates through video, screen sharing or the shared whiteboard."],
      ["Does it work for drawing, painting and craft classes?", "Yes. The same workflow supports drawing, painting, colouring, origami, craft, calligraphy and clay-modelling programmes."],
    ],
  },
  {
    slug: "yoga-class-software",
    eyebrow: "Yoga class management for teachers and studios",
    title: "Yoga class management software for registration, scheduling and online sessions.",
    sub: "Manage yoga class registrations, recurring schedules, attendance and fees, then teach group or private sessions with live video and recordings.",
    seoTitle: "Yoga Class Management & Registration Software | Meet to Manage",
    seoDescription: "Manage yoga class registration, schedules, attendance and fees, then run group or private online sessions with live video and recordings.",
    name: "Yoga class management and registration software",
    specific: [
      { title: "Registration and follow-up", body: "Keep each enquiry, demo session, enrolment and contact detail in one admissions pipeline, with follow-up tasks for your team." },
      { title: "Recurring yoga class schedules", body: "Plan regular group batches and private sessions, manage changes, and show every student their upcoming class from one calendar." },
      { title: "Live video you can demonstrate on", body: "Students join with their camera on, so you can see them and demonstrate each pose." },
      { title: "Everyone in one place", body: "See who has joined from the participants list, and mute the whole class with one control." },
      { title: "Replay a session", body: "Recorded classes can be replayed from the parent app, so students can practise again at home." },
      { title: "Yoga resources in the catalogue", body: "The learning catalogue includes Yoga, Meditation and Kids' Yoga Instructor Training." },
    ],
    closingHeading: "Built for wellness classes",
    closing: "Run group sessions and private one-to-one classes from the same account.",
    faq: [
      ["What does yoga class management software include?", "It connects enquiries, registration, recurring schedules, attendance, fees, online sessions, recordings and student communication in one system."],
      ["Can I manage group classes and one-to-one yoga sessions?", "Yes. The same account supports recurring group batches and private one-to-one sessions."],
      ["Does attendance work for online yoga classes?", "Yes. Attendance is connected to the scheduled live session when a student opens the class link."],
      ["Can students replay a recorded yoga session?", "Yes. Recordings can be replayed from the student or parent experience for the retention period included with the academy's plan."],
    ],
  },
  {
    slug: "abacus-class-software",
    eyebrow: "For abacus and mental maths teachers",
    title: "Online class software for abacus and Vedic maths teachers.",
    sub: "Teach abacus live with a shared whiteboard, speed quizzes and stars, and keep attendance, fees and the parent app in the same place.",
    seoTitle: "Online Abacus Class Software for Teachers | Meet to Manage",
    seoDescription: "Teach abacus, Vedic and mental maths online with a shared whiteboard, live quizzes, a leaderboard and recordings. Attendance, fees and parent app built in.",
    name: "Online class software for abacus teachers",
    specific: [
      { title: "A shared whiteboard for working", body: "Show bead positions and work through sums on a board every student sees." },
      { title: "Live quizzes for speed drills", body: "Launch questions from a reusable quiz bank, and rank answers with stars and a leaderboard." },
      { title: "Keep young learners engaged", body: "Stars, a leaderboard and celebration reactions reward effort during class." },
      { title: "Maths resources in the catalogue", body: "The learning catalogue includes Abacus, Vedic Maths, Mental Maths, Speed Maths and Memory Training." },
    ],
    closingHeading: "Built for maths centres",
    closing: "Abacus Teacher Training is also in the catalogue for centres that train their own teachers.",
  },
  {
    slug: "online-whiteboard-for-teaching",
    eyebrow: "For online teachers",
    title: "An online whiteboard for teaching live classes.",
    sub: "Write, draw and explain on a shared whiteboard every student sees, then keep attendance, fees and the parent app in the same place.",
    seoTitle: "Online Whiteboard for Teaching | Meet to Manage",
    seoDescription: "A shared online whiteboard for live teaching, with slides, screen sharing, quizzes and recordings. Attendance, fees and a parent app are built in.",
    name: "Online whiteboard for teaching",
    specific: [
      { title: "A whiteboard the whole class sees", body: "Write, draw and work through examples on a shared board during the live class." },
      { title: "Full screen when you need space", body: "Open the whiteboard full screen for longer explanations and worked problems." },
      { title: "Slides and screen sharing", body: "Present slides or share your screen, and mark them up as you teach." },
      { title: "Quizzes after the explanation", body: "Check understanding with live questions from a reusable quiz bank." },
    ],
    closingHeading: "More than a whiteboard",
    closing: "Recordings let students replay the explanation after class.",
  },
];

function makePage(n: Niche) {
  return function NichePage() {
    return (
      <SolutionFeaturePage
        eyebrow={n.eyebrow}
        title={n.title}
        sub={n.sub}
        seo={{ title: n.seoTitle, description: n.seoDescription, path: `/solutions/${n.slug}` }}
        name={n.name}
        features={[...n.specific, ...COMMON]}
        closingHeading={n.closingHeading}
        closing={
          <>
            {n.closing} See the general <Link to="/solutions/live-class-software-for-institutes" className={LINK}>live class software</Link>,{" "}
            <Link to="/solutions/phonics-live-class-software" className={LINK}>phonics classes</Link>,{" "}
            <Link to="/solutions/online-attendance-software-for-institutes" className={LINK}>online attendance</Link> or{" "}
            <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link>, or check the{" "}
            <Link to="/pricing" className={LINK}>pricing</Link>.
          </>
        }
        faq={n.faq}
      />
    );
  };
}

export const NICHE_ROUTES = NICHES.map((n) => ({ path: `/solutions/${n.slug}`, title: n.seoTitle, description: n.seoDescription, Page: makePage(n) }));
