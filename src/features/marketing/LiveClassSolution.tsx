import { Link } from "react-router-dom";
import { PageShell } from "./PageShell";
import { OpenSourceStrip } from "./OpenSourceStrip";
import { WalkthroughCta } from "./WalkthroughCta";

/** Every item below is a control or behaviour in the live classroom (toolbar, panels, parent app). Add a feature here only once it ships. */
const FEATURES = [
  { title: "Live video, built for classes", body: "Teachers and students join in the browser with camera and microphone controls, a pinned speaker view, and a teacher control to mute everyone at once." },
  { title: "Shared whiteboard", body: "Draw, drag and match on a shared board that the whole class sees, and open it full screen when the lesson needs the space." },
  { title: "Present slides and share your screen", body: "Share a screen or open a presentation in the room and annotate it live while students watch." },
  { title: "Live quizzes, stars and a leaderboard", body: "Launch a quiz during class and reward answers with stars and a leaderboard, which keeps younger learners engaged." },
  { title: "Learning games library", body: "Open ready-made games and teaching resources (145 titles across 10 skill areas) right inside the live class." },
  { title: "Waiting room and people panel", body: "Admit students one by one from the waiting room and see who is in the class, who has a hand raised and who is screen sharing." },
  { title: "Chat, reactions and raise hand", body: "Students ask questions through chat and the raise-hand button, and everyone can send celebration reactions." },
  { title: "Recordings for parents", body: "Classes can be recorded and replayed from the parent app for the retention period of your plan." },
  { title: "Attendance marked automatically", body: "Attendance is recorded when a student opens their class link, so there is no register to fill in afterwards." },
  { title: "Personal meeting rooms", body: "Every member has a permanent meeting room with a short invite link, for one-to-one sessions and live meetings outside the class timetable." },
];

export default function LiveClassSolution() {
  return (
    <PageShell
      eyebrow="Live classroom"
      title="Live class software for institutes and online coaching centres."
      sub="Video, whiteboard, quizzes and recordings in one room, connected to attendance, fees and the parent app."
      seo={{
        title: "Live Class Software for Institutes and Online Coaching — Meet to Manage",
        description: "Run live classes and meetings with video, shared whiteboard, quizzes, screen sharing and recordings. Attendance, fees and the parent app are built in.",
        path: "/solutions/live-class-software-for-institutes",
      }}
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Live class software for institutes",
        url: "https://meettomanage.cloud/solutions/live-class-software-for-institutes",
        about: { "@type": "SoftwareApplication", name: "Meet to Manage", applicationCategory: "EducationalApplication" },
      }}
    >
      <section className="bg-white pb-[clamp(64px,7vw,104px)]">
        <ul className="mx-auto grid max-w-[1000px] gap-5 px-5 md:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-2xl border border-[#EFE3D7] bg-white p-7">
              <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">{f.title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#57534E]">{f.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 px-5"><OpenSourceStrip /></div>
        <div className="mx-auto mt-10 max-w-[1000px] px-5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">More than a video call</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[#57534E]">
            The live classroom is one part of the platform. A class connects straight to attendance, invoices and reports, and families join from the
            parent app. Read about <Link to="/solutions/online-attendance-software-for-institutes" className="font-semibold text-[#C2410C] underline">attendance</Link>,{" "}
            <Link to="/solutions/fee-management-software-for-coaching-centres" className="font-semibold text-[#C2410C] underline">fee management</Link>,{" "}
            <Link to="/solutions/phonics-live-class-software" className="font-semibold text-[#C2410C] underline">teaching phonics online</Link>,{" "}
            see <Link to="/pricing" className="font-semibold text-[#C2410C] underline">pricing</Link>, or{" "}
            <Link to="/customers" className="font-semibold text-[#C2410C] underline">how other centres use it</Link>.
          </p>
          <WalkthroughCta className="mt-6" />
        </div>
      </section>
    </PageShell>
  );
}
