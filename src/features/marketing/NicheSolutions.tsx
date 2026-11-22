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
    slug: "music-class-software",
    eyebrow: "For music and instrument teachers",
    title: "Online class software for music and instrument teachers.",
    sub: "Teach music live with high-quality audio, a shared whiteboard for notes, and keep attendance, fees and the parent app in the same place.",
    seoTitle: "Online Music Class Software for Teachers | Meet to Manage",
    seoDescription: "Teach music, vocals and instruments online with clear audio, shared whiteboard, live quizzes and recordings. Attendance, fees and parent app built in.",
    name: "Online class software for music teachers",
    specific: [
      { title: "Clear audio for teaching", body: "Students hear your voice and instrument clearly. You can hear each student too, so you can correct pitch, timing and technique during class." },
      { title: "Shared whiteboard for notes and theory", body: "Write music notes, chord diagrams, scales and theory explanations on a board every student sees." },
      { title: "Record and replay performances", body: "Record live classes so students can replay your demonstration and review their own performance for practice." },
      { title: "Music resources in the catalogue", body: "The learning catalogue includes Music, Vocal Training and Instrument Lessons, ready to use in class." },
    ],
    closingHeading: "Built for music teachers",
    closing: "Perfect for schools, coaching centres and individual teachers offering music lessons online.",
    faq: [
      ["Can I teach multiple instruments on the platform?", "Yes. The same platform works for vocals, string, wind and percussion instruments with clear audio for each session."],
      ["Can students see music notes and theory in a live class?", "Yes. Use the shared whiteboard to write notes, draw chord diagrams and explain theory in real time."],
      ["Can students replay recorded music classes?", "Yes. Recorded classes can be replayed from the student or parent experience for the retention period of your plan."],
      ["Does it work for individual and group music lessons?", "Yes. You can schedule recurring group batches and private one-to-one sessions from the same account."],
    ],
  },
  {
    slug: "dance-class-software",
    eyebrow: "For dance and fitness teachers",
    title: "Online class software for dance and fitness teachers.",
    sub: "Manage dance class registrations, schedules and fees, then teach live with video, a shared whiteboard for choreography and recordings.",
    seoTitle: "Online Dance Class Software for Teachers | Meet to Manage",
    seoDescription: "Teach dance, fitness and movement online with live video, recordings, attendance tracking and fee management in one platform.",
    name: "Online class software for dance and fitness teachers",
    specific: [
      { title: "Live video you can see", body: "Students join with their camera on so you can see their posture, form and choreography as they practice." },
      { title: "Group and private sessions", body: "Schedule regular group dance batches and private one-to-one coaching sessions from the same calendar." },
      { title: "Record a routine for practice", body: "Record classes so students can replay the choreography at home, even between scheduled sessions." },
      { title: "Dance resources in the catalogue", body: "The learning catalogue includes Dance, Fitness and Movement classes, ready to use in live sessions." },
    ],
    closingHeading: "Built for movement teachers",
    closing: "Run group sessions and private coaching from the same account.",
    faq: [
      ["Can I teach dance online with good visibility?", "Yes. Students use their camera so you can see their posture and form during class, and you can correct in real time."],
      ["Can I schedule group dance classes and private coaching?", "Yes. The platform supports recurring group batches and private one-to-one sessions from the same calendar."],
      ["Can students replay a recorded dance session?", "Yes. Recordings can be replayed from the student or parent experience for the retention period of your plan."],
      ["Does it include attendance and fee management?", "Yes. Attendance is recorded when a student joins, and invoices and reminders are handled automatically."],
    ],
  },
  {
    slug: "coding-class-software",
    eyebrow: "For coding and robotics teachers",
    title: "Online class software for coding, robotics and technology teachers.",
    sub: "Teach coding live with screen sharing, a shared whiteboard for code, and keep attendance, fees and the parent app in the same place.",
    seoTitle: "Online Coding Class Software for Teachers | Meet to Manage",
    seoDescription: "Teach coding, robotics and technology online with screen sharing, shared whiteboard, quizzes and recordings. Attendance, fees and parent app built in.",
    name: "Online class software for coding and technology teachers",
    specific: [
      { title: "Screen sharing for coding demos", body: "Share your screen to show the code editor, terminal and development environment while students watch the live class." },
      { title: "Whiteboard for pseudocode and diagrams", body: "Write pseudocode, draw flowcharts and explain algorithms on a shared whiteboard every student sees." },
      { title: "Live quizzes for concept checks", body: "Launch questions from a quiz bank during class to test understanding of key concepts before moving on." },
      { title: "Coding resources in the catalogue", body: "The learning catalogue includes Coding, Robotics and other technology topics, ready to use in class." },
    ],
    closingHeading: "Built for tech teachers",
    closing: "Recordings let students replay the code demo after class.",
    faq: [
      ["Can I show my code editor and terminal during a live class?", "Yes. Use screen sharing to share your code editor, terminal and development environment with the whole class."],
      ["Can I teach both group and individual coding classes?", "Yes. The same account supports recurring group batches and private one-to-one coding sessions."],
      ["Can students replay a recorded coding session?", "Yes. Recorded classes can be replayed from the student or parent experience so students can follow the code again."],
      ["Does it support robotics and hands-on projects?", "Yes. Screen sharing and the whiteboard work for demonstrating hardware setups, wiring diagrams and project walkthroughs."],
    ],
  },
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
    faq: [
      ["Can I teach grammar and spoken English in one class?", "Yes. The same platform supports grammar lessons with whiteboard and slides, plus spoken English practice with live video."],
      ["Does the quiz bank have English-specific questions?", "Yes. The learning catalogue includes English Grammar, Vocabulary Building, Spoken English, Phonetics and Public Speaking topics."],
      ["Can students replay a recorded grammar lesson?", "Yes. Recorded classes can be replayed from the parent app so students can review grammar rules and sentence structures."],
      ["Does it work for one-to-one and group English lessons?", "Yes. You can schedule recurring group batches and private one-to-one English sessions from the same account."],
    ],
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
            {n.slug === "online-whiteboard-for-teaching" && <>{" "}Try these <Link to="/blog/interactive-whiteboard-activities-online-classes" className={LINK}>10 interactive whiteboard activities for online classes</Link>.</>}
            {n.slug === "art-class-software" && <>{" "}For lesson ideas, explore the <Link to="/blog/interactive-whiteboard-activities-online-classes" className={LINK}>interactive whiteboard activity guide</Link>.</>}
          </>
        }
        faq={n.faq}
        selfSlug={n.slug}
      />
    );
  };
}

export const NICHE_ROUTES = NICHES.map((n) => ({ path: `/solutions/${n.slug}`, title: n.seoTitle, description: n.seoDescription, Page: makePage(n) }));
