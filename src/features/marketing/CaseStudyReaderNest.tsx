import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ExternalLink, BookOpen, Check, Sparkles } from "lucide-react";
import { PageShell } from "./PageShell";

// Story supplied by the customer. Generated lifestyle imagery is labelled.
const SECTIONS = [
  {
    "title": "It Started With One Little Girl Learning to Read",
    "paragraphs": [
      "Before The Reader Nest became a growing learning community, it began with founder Akanksha Nagar's determination to help her daughter, Lamya.",
      "When young Lamya struggled to connect letters with sounds, Akanksha started experimenting with toys, sounds, and playful teaching methods.",
      "Within two months, her daughter became a confident reader.",
      "That small but meaningful transformation inspired a bigger dream: helping more children discover the joy of learning.",
      "The Reader Nest was born from that belief.",
      "Today, the academy offers phonics, reading, mathematics, public speaking, and other skill-building programmes designed to help children grow with confidence.",
      "But behind every joyful classroom is an entire team working to make the learning experience possible."
    ]
  },
  {
    "title": "The Challenge: A Growing Academy Needs More Than a Virtual Classroom",
    "paragraphs": [
      "As The Reader Nest expanded its learning operations, its team needed more than a place to conduct online classes.",
      "Every student had a journey.",
      "An enquiry became a demo class. A successful demo became an enrolment. An enrolment became a learning schedule involving teachers, parents, coordinators, and relationship managers.",
      "Behind that journey were hundreds of small but important operational decisions.",
      "Who conducts the next class? What happens when a teacher takes leave? How does a parent pay in instalments? Where can the management team review class recordings and teacher payouts?",
      "The academy needed a platform that understood how its team actually worked—not one that required its team to change everything to fit the software."
    ]
  },
  {
    "title": "The Partnership: Technology That Listens to Educators",
    "paragraphs": [
      "That's where the MeetToManage team came in.",
      "Rather than simply delivering a standard software package, the partnership focused on understanding The Reader Nest's everyday workflows and translating them into a customised digital experience.",
      "The teams worked closely on admissions, teacher scheduling, live classrooms, learning resources, parent access, and management operations.",
      "Existing student and batch records were migrated into the new environment, helping the academy transition from its previous learning management system.",
      "And the most important work continued after the first release.",
      "As teachers began conducting classes, relationship managers organised batches, and parents interacted with the portal, their feedback shaped the next improvements.",
      "Meeting links became easier to manage. Scheduling tools became more flexible. Classroom experiences were refined. Administrative reporting became more detailed.",
      "The platform evolved through real usage—not assumptions."
    ]
  },
  {
    "title": "The Transformation: Bringing the Learning Journey Together",
    "paragraphs": [
      "**A smoother journey from enquiry to enrolment**",
      "The admissions team can organise demos, manage student enrolments, and track important information throughout the onboarding process.",
      "**A classroom designed for real teaching**",
      "Teachers can conduct live sessions with interactive classroom tools, while recordings and learning resources support students beyond class time.",
      "**More flexibility for families**",
      "Parent-facing experiences support class information, learning resources, and course payments, including flexible instalment handling.",
      "**Better coordination behind every class**",
      "Batch scheduling, teacher availability, class monitoring, and role-based access help the academy team coordinate daily learning activities.",
      "**Greater visibility for management**",
      "Administrative dashboards, collection reporting, and teacher payout reviews bring important operational information into a more connected environment."
    ]
  },
  {
    "title": "The Real Success Is in the Everyday Moments",
    "paragraphs": [
      "A successful education platform isn't defined only by its features.",
      "It's in the moment an admission counsellor schedules a demo without unnecessary complications.",
      "It's when a teacher can focus on explaining a difficult concept instead of managing administrative work.",
      "It's when a parent can access learning information more conveniently.",
      "And it's when an academy manager has the information needed to make a fair, informed decision.",
      "For The Reader Nest, these everyday workflows are what the technology is designed to support.",
      "The partnership continues to evolve as the academy shares feedback, identifies new needs, and improves its digital learning operations."
    ]
  },
  {
    "title": "One Shared Belief: Education Comes First",
    "paragraphs": [
      "The Reader Nest was built on a mother's belief that every child deserves the opportunity to learn confidently.",
      "MeetToManage was built on a complementary idea: the people delivering that education deserve technology that makes their work easier.",
      "One team brings the teaching.",
      "The other builds the technology supporting it.",
      "Together, they're working towards a more connected learning experience for educators, families, and the children at the centre of it all.",
      "**Because behind every confident learner is a dedicated educator—and behind every great academy should be technology that supports them.**"
    ]
  }
];
const CHAPTERS = ["The beginning", "The challenge", "The partnership", "The transformation", "Everyday impact", "A shared belief"];
const HEADING = "font-display text-[clamp(1.6rem,2.8vw,2.2rem)] font-extrabold leading-[1.18] tracking-[-0.04em] text-[#24221F]";
const TEXT = "mt-5 text-[17px] leading-[1.9] text-[#625E57]";

export default function CaseStudyReaderNest() {
  return (
    <PageShell
      eyebrow="Customer story"
      title="Every Great Classroom Has a Story Behind It"
      seo={{ title: "The Reader Nest Customer Story - Meet to Manage", description: "How The Reader Nest partnered with MeetToManage to bring admissions, live classrooms, teacher scheduling and parent access together in a customised learning platform.", path: "/customers/the-reader-nest", type: "article" }}
      jsonLd={{
        "@context": "https://schema.org", "@type": "Article",
        headline: "Every Great Classroom Has a Story Behind It",
        url: "https://meettomanage.cloud/customers/the-reader-nest",
        image: "https://meettomanage.cloud/clients/reader-nest/reading-photo.webp",
        publisher: { "@type": "Organization", name: "Meet to Manage" },
        about: { "@type": "Organization", name: "The Reader Nest", founder: { "@type": "Person", name: "Akanksha Nagar" }, url: "https://thereadernest.com/" },
      }}
      hero={
        <section className="relative overflow-hidden border-b border-[#EAE2D7] bg-[#FFF6EE]">
          <div aria-hidden="true" className="pointer-events-none absolute -end-40 -top-40 h-[650px] w-[650px] rounded-full bg-[#F0D5B6]/35 blur-3xl" />
          <div className="relative mx-auto max-w-[1200px] px-5 pb-12 pt-7 sm:px-8 lg:pb-20 lg:pt-9">
            <Link to="/customers" className="inline-flex items-center gap-2 text-xs font-semibold text-[#70675C] transition-colors hover:text-[#C2410C]"><ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" /> Customer stories</Link>
            <div className="mt-9 grid items-center gap-10 lg:mt-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              <div>
                <h1 className="font-display mt-6 max-w-[620px] text-[clamp(2.6rem,4.5vw,4.3rem)] font-extrabold leading-[1.06] tracking-[-0.055em] text-[#26231E]">Every great classroom has <span className="font-serif font-normal italic text-[#B34B26]">a story</span> behind it.</h1>
                <p className="mt-6 max-w-[490px] text-[17px] leading-[1.85] text-[#70675C]">How The Reader Nest and MeetToManage brought educators, students and parents together around what matters most: the joy of learning.</p>
                <div className="mt-8 flex items-center gap-3.5 border-t border-[#E5DCCD] pt-6">
                  <img src="/clients/thereader.png" alt="The Reader Nest logo" width={48} height={48} className="h-12 w-12 rounded-full bg-white object-cover ring-1 ring-[#E5DCCD]" />
                  <div><p className="text-sm font-bold text-[#29251F]">The Reader Nest</p><p className="mt-1 text-xs text-[#786D60]">Founded by Akanksha Nagar</p></div>
                </div>
                <a href="#story-section-0" className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#C2410C] px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#9A3412] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B6441D]">Discover their story <ArrowRight className="h-4 w-4 rtl:-scale-x-100" /></a>
              </div>
              <figure className="relative mx-auto w-full max-w-[490px]">
                <div className="overflow-hidden rounded-t-[160px] rounded-b-[24px] border-[6px] border-white shadow-[0_24px_70px_-25px_rgba(86,60,31,0.35)] sm:rounded-t-[200px]">
                  <img src="/clients/reader-nest/reading-photo.webp" alt="AI-generated illustrative scene of a mother helping a child read" width={1536} height={1024} fetchPriority="high" className="aspect-[4/5] w-full object-cover object-[center_40%]" />
                </div>
                <figcaption className="relative mx-4 -mt-14 rounded-2xl border border-[#EAE2D7] bg-white px-5 py-4 shadow-[0_10px_35px_-15px_rgba(53,40,25,0.2)] sm:mx-7">
                  <span className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#B34B26]"><BookOpen className="h-3.5 w-3.5" /> Where it all began</span>
                  <span className="block text-sm font-semibold leading-relaxed text-[#37312B]">A love for learning, one page at a time.</span>
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
            {[["The academy", "The Reader Nest"], ["Their world", "Early childhood & online education"], ["Our work together", "Academy management & live learning"]].map(([label, value]) => <div key={label} className="sm:border-s sm:border-[#E5DCCD] sm:ps-6 first:sm:border-0 first:sm:ps-0"><dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A8069]">{label}</dt><dd className="mt-2 text-sm font-semibold leading-relaxed text-[#40382F]">{value}</dd></div>)}
          </dl>
        </div>
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 pt-12 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-20 lg:pt-20">
          <aside className="min-w-0">
            <div className="lg:sticky lg:top-28">
              <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-[#9B826E]">Inside the story</p>
              <nav aria-label="Story chapters" className="mt-5 flex gap-2 overflow-x-auto pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
                {CHAPTERS.map((chapter, index) => <a key={chapter} href={"#story-section-" + index} className="group inline-flex shrink-0 items-center gap-3 rounded-lg border border-[#EEE6DC] px-3 py-2.5 text-xs text-[#70675C] transition-colors hover:border-[#D7B69A] hover:bg-[#FBF4EB] hover:text-[#A4431B] lg:border-0 lg:px-0"><span className="text-[10px] tabular-nums text-[#B4A18F]">0{index + 1}</span>{chapter}</a>)}
              </nav>
              <div className="mt-7 hidden border-t border-[#EEE6DC] pt-6 lg:block"><p className="text-sm font-bold text-[#40382F]">Meet the academy</p><a href="https://thereadernest.com/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#A4431B]">Visit The Reader Nest <ExternalLink className="h-3 w-3" /><span className="sr-only"> (opens in a new tab)</span></a></div>
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
                  <img src="/clients/reader-nest/teacher-photo.webp" alt="AI-generated illustrative scene of an educator teaching online" width={1536} height={1024} loading="lazy" className="aspect-[3/2] w-full object-cover" />
                  <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-[#FFF6EE] px-5 py-4 text-xs"><span className="font-semibold text-[#665647]">More confidence. More possibility.</span><span className="text-[#827669]">AI-generated illustrative image</span></figcaption>
                </figure>}
                {index === 2 && <figure className="mt-9 overflow-hidden rounded-2xl border border-[#E5DDD1] bg-[#F7F3EB] p-3 sm:p-5">
                  <div className="mb-4 flex items-center gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-[#D8BBA7]" /><span className="h-2 w-2 rounded-full bg-[#E2CCAB]" /><span className="h-2 w-2 rounded-full bg-[#C7CCB6]" /><span className="ms-2 text-[10px] tracking-wide text-[#8D7A67]">THE TECHNOLOGY BEHIND THE TEACHING</span></div>
                  <img src="/product/classroom-1200.webp" alt="MeetToManage live classroom interface" width={1200} loading="lazy" className="h-auto w-full rounded-lg" />
                  <figcaption className="pt-4 text-center text-xs text-[#827669]">MeetToManage live classroom. Product illustration.</figcaption>
                </figure>}
              </section>
            ))}
            <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#EEE6DC] pt-6 text-xs text-[#827669]">
              <a href="https://thereadernest.com/about-us/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#A4431B]">Read the academy's story<span className="sr-only"> (opens in a new tab)</span></a>
              <a href="https://www.instagram.com/the_reader_nest/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#A4431B]">Follow The Reader Nest<span className="sr-only"> (opens in a new tab)</span></a>
            </div>
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
        </section>
      </article>
    </PageShell>
  );
}
