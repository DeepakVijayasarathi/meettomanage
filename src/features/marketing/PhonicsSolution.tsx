import { Link } from "react-router-dom";
import { SolutionFeaturePage } from "./SolutionFeaturePage";

const LINK = "font-semibold text-[#C2410C] underline";

/** Every item below is a control or behaviour in the live classroom or parent app. Add a feature here only once it ships. */
const FEATURES = [
  { title: "A shared whiteboard the whole class sees", body: "Draw, drag and match on a shared board, and open it full screen when the lesson needs the space." },
  { title: "Live quizzes with stars and a leaderboard", body: "Launch a quiz during class and reward answers with stars and a leaderboard, which keeps younger learners engaged." },
  { title: "Ready-made games inside the class", body: "Open a library of learning games and teaching resources (145 titles across 10 skill areas) without leaving the live room." },
  { title: "Built for small learners", body: "Students ask questions with the raise-hand button and chat, and everyone can send celebration reactions. You can mute everyone at once with one control." },
  { title: "A waiting room you control", body: "Admit children one by one, and see who is in the class, who has a hand raised and who is sharing their screen." },
  { title: "One-to-one and group classes", body: "Run small groups and individual sessions on the same platform. Every member also has a permanent meeting room with a short invite link." },
  { title: "Recordings parents can replay", body: "Classes can be recorded and replayed from the parent app for the retention period of your plan." },
  { title: "A parent app for every family", body: "Parents see the next class and join with one tap, with no separate links or WhatsApp messages to chase." },
  { title: "Attendance without a register", body: "Attendance is recorded when a child opens their class link, so there is nothing to fill in afterwards." },
  { title: "Fees handled for you", body: "Invoices and reminders are created automatically, and families pay online from the same app." },
];

export default function PhonicsSolution() {
  return (
    <SolutionFeaturePage
      eyebrow="For phonics and early reading"
      title="Live class software for phonics and early-reading teachers."
      sub="Teach online with a shared whiteboard, quizzes, stars and recordings, and keep attendance, fees and the parent app in the same place."
      seo={{
        title: "Live Class Software for Phonics and Early-Reading Teachers — Meet to Manage",
        description: "Teach phonics online with a shared whiteboard, live quizzes, stars, learning games and recordings. Attendance, fees and a parent app are built in.",
        path: "/solutions/phonics-live-class-software",
      }}
      name="Live class software for phonics teachers"
      features={FEATURES}
      closingHeading="Used by phonics and storytelling centres"
      closing={
        <>
          The Reader Nest, a phonics and public speaking centre, runs one-to-one and group classes on Meet to Manage. Read{" "}
          <Link to="/customers/the-reader-nest" className={LINK}>their story</Link> or meet <Link to="/customers/alphabet" className={LINK}>Alphabet, a Jolly Phonics and storytelling academy</Link>. See how the{" "}
          <Link to="/solutions/live-class-software-for-institutes" className={LINK}>live classroom</Link> and{" "}
          <Link to="/solutions/fee-management-software-for-coaching-centres" className={LINK}>fee management</Link> work, or check the{" "}
          <Link to="/pricing" className={LINK}>pricing</Link>. Families can also try our <Link to="/free-games" className={LINK}>free alphabet, phonics and listening games</Link> without creating an account.
        </>
      }
    />
  );
}
