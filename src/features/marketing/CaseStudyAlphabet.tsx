import { PricingLink } from "./PricingLink";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Sparkles } from "lucide-react";
import { PageShell } from "./PageShell";

// Profile uses the existing customer listing. Platform capabilities are not customer-specific results or testimonials.
const SECTIONS = [
  {
    "title": "A World of Sounds and Stories",
    "paragraphs": [
      "Alphabet is a Jolly Phonics and storytelling academy, and a Meet to Manage customer.",
      "Its name captures the world its programmes explore: letters, sounds, words and the stories children can discover through them.",
      "Phonics and storytelling offer two complementary ways to engage young learners. One explores the sounds within words; the other gives those words meaning through characters, imagination and conversation."
    ]
  },
  {
    "title": "Making Room for the Teaching",
    "paragraphs": [
      "A phonics lesson needs room for children to listen, repeat a sound, ask a question and try again. A storytelling session needs room for conversation and imagination.",
      "Running a learning programme also involves schedules, enrolments, learning resources and communication with families. These are the everyday tasks Meet to Manage is built to support.",
      "The goal is straightforward: give educators a connected place to organise the work around their classes."
    ]
  },
  {
    "title": "The Platform Behind the Learning",
    "paragraphs": [
      "Alphabet is part of the Meet to Manage customer community.",
      "Meet to Manage brings live classrooms, admissions, scheduling, learning resources, fees and parent access into one platform. Its classroom tools include a shared whiteboard, screen sharing and learning activities.",
      "For an academy exploring digital teaching, these capabilities connect the lesson itself with the organisation around it. The classroom illustration below shows the platform's teaching environment."
    ]
  },
  {
    "title": "Tools for the Everyday Learning Journey",
    "paragraphs": [
      "**Live teaching**",
      "Video, a shared whiteboard and screen sharing give educators ways to explain sounds, share a story and invite participation.",
      "**Learning resources**",
      "Worksheets and teaching materials can support practice alongside live lessons.",
      "**Class organisation**",
      "Scheduling and batch tools help academy teams organise lessons and teacher availability.",
      "**Family access**",
      "Parent-facing tools bring class information, resources and payments into one place.",
      "**Academy administration**",
      "Admissions, fee collection and reporting tools support the work that surrounds each class."
    ]
  },
  {
    "title": "Keeping the Focus on Young Learners",
    "paragraphs": [
      "Learning to read takes practice. Sharing a story invites children to listen, imagine and express an idea in their own words.",
      "Technology can support that experience by making teaching resources and class organisation easier to access. The educator still brings the attention, encouragement and care.",
      "Alphabet's focus on Jolly Phonics and storytelling gives this customer profile its starting point: the relationship between sounds, stories and a child's curiosity."
    ]
  },
  {
    "title": "A Place for the Next Chapter",
    "paragraphs": [
      "Every academy brings its own teaching approach. Meet to Manage provides tools for the people organising and delivering that learning.",
      "For Alphabet, the subjects are Jolly Phonics and storytelling. For Meet to Manage, the work is building a platform that supports educators and the families around them.",
      "**Behind every lesson is an educator making space for a child to learn.**"
    ]
  }
];
const CHAPTERS = ["Sounds and stories", "The teaching", "The platform", "Everyday tools", "Young learners", "The next chapter"];
const HEADING = "font-display text-[clamp(1.6rem,2.8vw,2.2rem)] font-extrabold leading-[1.18] tracking-[-0.04em] text-[#24221F]";
const TEXT = "mt-5 text-[17px] leading-[1.9] text-[#625E57]";

export default function CaseStudyAlphabet() {
  return (
    <PageShell
      eyebrow="Customer story"
      title="A World of Sounds, Stories and Possibility"
      seo={{ title: "Alphabet Customer Story - Meet to Manage", description: "Meet Alphabet, a Jolly Phonics and storytelling academy in the Meet to Manage customer community. Explore its teaching focus and the tools built for educators.", path: "/customers/alphabet", type: "article" }}
      jsonLd={{
        "@context": "https://schema.org", "@type": "Article",
        headline: "A World of Sounds, Stories and Possibility",
        url: "https://meettomanage.cloud/customers/alphabet",
        image: "https://meettomanage.cloud/images/landing/phonics-class.webp",
        publisher: { "@type": "Organization", name: "Meet to Manage" },
        about: { "@type": "Organization", name: "Alphabet" },
      }}
      hero={
        <section className="relative overflow-hidden border-b border-[#EAE2D7] bg-[#FFF6EE]">
          <div aria-hidden="true" className="pointer-events-none absolute -end-40 -top-40 h-[650px] w-[650px] rounded-full bg-[#F0D5B6]/35 blur-3xl" />
          <div className="relative mx-auto max-w-[1200px] px-5 pb-12 pt-7 sm:px-8 lg:pb-20 lg:pt-9">
            <Link to="/customers" className="inline-flex items-center gap-2 text-xs font-semibold text-[#70675C] transition-colors hover:text-[#C2410C]"><ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" /> Customer stories</Link>
            <div className="mt-9 grid items-center gap-10 lg:mt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              <div>
                <h1 className="font-display mt-6 max-w-[620px] text-[clamp(2.6rem,4.5vw,4.3rem)] font-extrabold leading-[1.06] tracking-[-0.055em] text-[#26231E]">A world of sounds, <span className="font-serif font-normal italic text-[#B34B26]">stories</span> and possibility.</h1>
                <p className="mt-6 max-w-[490px] text-[17px] leading-[1.85] text-[#70675C]">Meet Alphabet: Jolly Phonics, storytelling and a place in the Meet to Manage customer community.</p>
                <div className="mt-8 flex items-center gap-3.5 border-t border-[#E5DCCD] pt-6">
                  <img src="/clients/alphabet.webp" alt="Alphabet logo" width={48} height={48} className="h-12 w-24 rounded-lg bg-white object-contain ring-1 ring-[#E5DCCD]" />
                  <div><p className="text-sm font-bold text-[#29251F]">Alphabet</p><p className="mt-1 text-xs text-[#786D60]">Jolly Phonics & Storytelling</p></div>
                </div>
                <a href="#story-section-0" className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#C2410C] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B6441D]">Discover their story <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></a>
              </div>
              <figure className="relative mx-auto w-full max-w-[490px]">
                <div className="overflow-hidden rounded-t-[160px] rounded-b-[24px] border-[6px] border-white shadow-[0_24px_70px_-25px_rgba(86,60,31,0.35)] sm:rounded-t-[200px]">
                  <img src="/images/landing/phonics-class.webp" alt="AI-generated illustrative scene of a phonics lesson" width={1536} height={1024} fetchPriority="high" className="aspect-[4/5] w-full object-cover object-[center_40%]" />
                </div>
                <figcaption className="relative mx-4 -mt-14 rounded-2xl border border-[#EAE2D7] bg-white px-5 py-4 shadow-[0_10px_35px_-15px_rgba(53,40,25,0.2)] sm:mx-7">
                  <span className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#B34B26]"><BookOpen className="h-3.5 w-3.5" /> Sounds meet stories</span>
                  <span className="block text-sm font-semibold leading-relaxed text-[#37312B]">Jolly Phonics & Storytelling.</span>
                  <span className="mt-1 block text-[11px] text-[#827669]">AI-generated illustrative image.</span>
                </figcaption>
              </figure>
            </div>
          </div>
        </section>
      }
    >
      <article className="bg-white pb-16 sm:pb-24">
        <div className="border-b border-[#EEE8DF] bg-white">
          <dl className="mx-auto grid max-w-[1200px] gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 sm:py-10">
            {[["The academy", "Alphabet"], ["Their world", "Jolly Phonics & Storytelling"], ["The platform", "Meet to Manage"]].map(([label, value]) => <div key={label} className="sm:border-s sm:border-[#E5DCCD] sm:ps-6 first:sm:border-0 first:sm:ps-0"><dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A8069]">{label}</dt><dd className="mt-2 text-sm font-semibold leading-relaxed text-[#40382F]">{value}</dd></div>)}
          </dl>
        </div>
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 pt-12 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-20 lg:pt-20">
          <aside className="min-w-0">
            <div className="lg:sticky lg:top-28">
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9B826E]">Inside the story</p>
              <nav aria-label="Story chapters" className="mt-5 flex gap-2 overflow-x-auto pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
                {CHAPTERS.map((chapter, index) => <a key={chapter} href={"#story-section-" + index} className="group inline-flex shrink-0 items-center gap-3 rounded-lg border border-[#EEE6DC] px-3 py-2.5 text-xs text-[#70675C] transition-colors hover:border-[#D7B69A] hover:bg-[#FBF4EB] hover:text-[#A4431B] lg:border-0 lg:px-0"><span className="text-[10px] tabular-nums text-[#B4A18F]">0{index + 1}</span>{chapter}</a>)}
              </nav>
            </div>
          </aside>
          <div className="min-w-0 max-w-[780px]">
            {SECTIONS.map((section, index) => (
              <section key={section.title} aria-labelledby={"story-section-" + index} className="mt-14 border-t border-[#EEE8DF] pt-12 first:mt-0 first:border-0 first:pt-0 sm:mt-20 sm:pt-16">
                <p className="mb-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.17em] text-[#B34B26]"><span aria-hidden="true" className="h-px w-7 bg-[#CB8766]" />{CHAPTERS[index]}</p>
                <h2 id={"story-section-" + index} className={HEADING + " scroll-mt-28"}>{section.title}</h2>
                {index === 3 ? <div className="mt-8 grid gap-4 sm:grid-cols-2">{section.paragraphs.filter((_, i) => i % 2 === 0).map((title, i) => <div key={title} className={"rounded-2xl border border-[#E9E2D7] bg-[#FFF6EE] p-6 " + (i === 4 ? "sm:col-span-2" : "")}><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFEBDD] text-[#C2410C]"><Check className="h-4 w-4" /></span><h3 className="mt-4 text-base font-bold leading-snug text-[#332C24]">{title.slice(2, -2)}</h3><p className="mt-3 text-sm leading-[1.85] text-[#70675C]">{section.paragraphs[i * 2 + 1]}</p></div>)}</div>
                  : section.paragraphs.map((paragraph, i) => paragraph.startsWith("**") ? <p key={i} className="font-serif mt-8 border-s-2 border-[#B34B26] bg-[#FFF6EE] px-6 py-7 text-[24px] italic leading-relaxed text-[#804526]">{paragraph.slice(2, -2)}</p> : <p key={i} className={TEXT}>{paragraph}</p>)}
                {index === 0 && <figure className="mt-8 overflow-hidden rounded-2xl border border-[#EEE6DC]">
                  <img src="/images/landing/one-to-one-tutoring.webp" alt="AI-generated illustrative scene of one-to-one learning" width={1536} height={1024} loading="lazy" className="aspect-[3/2] w-full object-cover" />
                  <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF6EE] px-5 py-4 text-xs"><span className="font-semibold text-[#665647]">More confidence. More possibility.</span><span className="text-[#827669]">AI-generated illustrative image</span></figcaption>
                </figure>}
                {index === 2 && <figure className="mt-9 overflow-hidden rounded-2xl border border-[#E5DDD1] bg-[#F7F3EB] p-3 sm:p-5">
                  <div className="mb-4 flex items-center gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-[#D8BBA7]" /><span className="h-2 w-2 rounded-full bg-[#E2CCAB]" /><span className="h-2 w-2 rounded-full bg-[#C7CCB6]" /><span className="ms-2 text-[10px] tracking-wide text-[#8D7A67]">THE TECHNOLOGY BEHIND THE TEACHING</span></div>
                  <img src="/product/classroom-1200.webp" alt="MeetToManage live classroom interface" width={1200} loading="lazy" className="h-auto w-full rounded-lg" />
                  <figcaption className="pt-4 text-center text-xs text-[#827669]">MeetToManage live classroom. Product illustration.</figcaption>
                </figure>}
              </section>
            ))}

          </div>
        </div>
        <section className="relative mx-5 mt-16 overflow-hidden rounded-3xl bg-[#C2410C] px-6 py-12 text-center text-white sm:mx-8 sm:px-12 sm:py-16 lg:mx-auto lg:mt-24 lg:max-w-[1136px]">
          <div aria-hidden="true" className="pointer-events-none absolute -end-24 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -start-20 h-80 w-80 rounded-full border border-white/10" />
          <Sparkles className="mx-auto h-6 w-6 text-white" />
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFEBDD]">Built for educators. Designed for growth.</p>
          <h2 className="font-display mx-auto mt-5 max-w-[680px] text-[clamp(1.9rem,3.5vw,3rem)] font-bold leading-[1.15] tracking-[-0.04em]">Your academy has a story.<br /><span className="font-serif font-normal italic text-white">Let's build what comes next.</span></h2>
          <p className="mx-auto mt-5 max-w-[530px] text-[15px] leading-relaxed text-[#FFF6EE]">Bring admissions, live classrooms and everyday operations together with a platform that understands your academy.</p>
          <Link to="/get-started" className="relative mt-8 inline-flex items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-bold text-[#9A3412] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Book your free walkthrough <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></Link>
          <div className="relative"><PricingLink className="text-white/90 hover:text-white focus-visible:outline-white" /></div>
        </section>
      </article>
    </PageShell>
  );
}
