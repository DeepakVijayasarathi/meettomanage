import { ArrowLeft, Check, Ear, Play, Sparkles, Type } from "lucide-react";
import { Link } from "react-router-dom";
import { PageShell } from "../PageShell";
import { LiteracyGame, type LiteracyGameMode } from "./LiteracyGame";

const SITE = "https://meettomanage.cloud";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C2410C]";

export const FREE_GAMES = [
  {
    mode: "alphabet" as LiteracyGameMode,
    slug: "alphabet",
    name: "Alphabet match",
    title: "Free alphabet matching game for beginners",
    seoTitle: "Free Alphabet Matching Game for Kids | Meet to Manage",
    description: "Play a free alphabet game: match capital letters to small letters in short, untimed rounds. No account, download or payment required.",
    skill: "Capital & small letters",
    illustration: ["A", "a"],
    icon: Type,
    colour: "bg-[#FFF0E3]",
    intro: "Look at a capital letter, then choose its matching small letter. Each round gives you a fresh set of choices to practise recognising letter shapes.",
    steps: ["Start a round and look at the capital letter.", "Choose the matching small letter from the three buttons.", "Read the feedback, try again if needed, then move to the next letter."],
    adultNote: "Say the letter name together before choosing. You can also find the same letter in a book or on a label after the round. This activity practises letter matching; it does not test reading fluency.",
    faq: [
      { q: "Does the alphabet game cover the whole alphabet?", a: "Questions are selected from all 26 English letters. A short round practises a selection; restart to try another set." },
      { q: "Is there a time limit?", a: "No. Take as much time as you need, and use the Next button after finding the match." },
    ],
  },
  {
    mode: "phonics" as LiteracyGameMode,
    slug: "phonics",
    name: "Beginning-letter phonics",
    title: "Free beginning-letter phonics game",
    seoTitle: "Free Beginning-Letter Phonics Game | Meet to Manage",
    description: "Practise beginning-letter phonics with familiar words and pictures. Choose the first letter, hear an example word and play free without signing in.",
    skill: "Words & beginning letters",
    illustration: ["S", "☀"],
    icon: Sparkles,
    colour: "bg-[#FFF4D7]",
    intro: "Explore the connection between a familiar word and its beginning letter. Look at the picture and word, listen if you wish, then choose the letter that starts it.",
    steps: ["Look at the picture and read the example word with a grown-up if needed.", "Use Listen to hear the whole word, or work from the visible word.", "Choose its beginning letter and use the feedback before moving on."],
    adultNote: "Say the example word naturally and draw attention to its first sound. The audio reads whole words using your device's speech voice. It does not model isolated phonemes or replace a teacher's phonics lesson.",
    faq: [
      { q: "Does the game teach every English spelling pattern?", a: "No. It is a small beginning-letter activity using familiar words. It does not cover every sound, digraph or alternative spelling." },
      { q: "Can I play without audio?", a: "Yes. The picture and word stay visible, so a grown-up can read the word aloud or help you use the clue." },
    ],
  },
  {
    mode: "sounds" as LiteracyGameMode,
    slug: "word-sounds",
    name: "Listen & match",
    title: "Free listening and word-sounds game",
    seoTitle: "Free Listening & Word-Sounds Game | Meet to Manage",
    description: "Listen to a spoken word and choose the matching picture in this free English game. Replay audio or reveal a text clue. No signup required.",
    skill: "Listening & word recognition",
    illustration: ["♪", "☀"],
    icon: Ear,
    colour: "bg-[#EEF4EA]",
    intro: "Press Listen, hear a familiar English word, then choose the picture and label that match it. Replay the word whenever you need to, or reveal a text clue.",
    steps: ["Start the round and press Listen when you are ready.", "Choose the picture and word that match what you heard.", "Replay the audio or reveal the word as a clue. Then try the next question."],
    adultNote: "Keep the device volume comfortable. Word pronunciation depends on the English voice available on your device. This activity uses spoken words rather than environmental sound effects or isolated letter sounds.",
    faq: [
      { q: "What if the sound does not play?", a: "Check your device volume and press Listen again. You can reveal the word as a text clue and finish the round even when speech is unavailable." },
      { q: "Does the game record my voice?", a: "No. It plays a device-generated voice and uses answer buttons. It does not request microphone access." },
    ],
  },
];

function GameCards({ exclude }: { exclude?: LiteracyGameMode }) {
  return <div className={"grid gap-5 "+(exclude ? "md:grid-cols-2" : "md:grid-cols-3")}>
    {FREE_GAMES.filter(g => g.mode !== exclude).map(game => <article key={game.slug} className="group flex flex-col overflow-hidden rounded-3xl border border-[#EEDACB] bg-white shadow-[0_18px_40px_-32px_rgba(194,65,12,0.4)]">
      <div aria-hidden="true" className={"flex min-h-40 items-center justify-center gap-4 p-7 "+game.colour}>
        {game.illustration.map((letter, i) => <span key={letter} className={"font-display flex h-20 w-20 items-center justify-center rounded-[22px] bg-white text-5xl font-extrabold text-[#C2410C] shadow-[0_8px_20px_-14px_rgba(108,58,28,0.5)] "+(i === 0 ? "-rotate-6" : "rotate-6")}>{letter}</span>)}
      </div>
      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#A4431B]">{game.skill}</p>
        <h2 className="font-display mt-3 text-2xl font-extrabold leading-tight tracking-tight text-[#1C1917]">{game.name}</h2>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-[#6B625B]">{game.intro}</p>
        <Link to={"/free-games/"+game.slug} className={"mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#C2410C] px-5 py-3 text-sm font-bold text-white hover:bg-[#9A3412] "+FOCUS}><Play aria-hidden="true" className="h-4 w-4" fill="currentColor" />Play free<span className="sr-only">: {game.name}</span></Link>
      </div>
    </article>)}
  </div>;
}

function Breadcrumb({ name, slug }: { name?: string; slug?: string }) {
  return <nav aria-label="Breadcrumb" className="mb-6 text-xs text-[#786B60]"><ol className="flex flex-wrap items-center gap-2"><li><Link to="/" className="hover:text-[#C2410C]">Home</Link></li><li aria-hidden="true">/</li><li>{slug ? <Link to="/free-games" className="hover:text-[#C2410C]">Free learning games</Link> : <span aria-current="page">Free learning games</span>}</li>{name && <><li aria-hidden="true">/</li><li aria-current="page">{name}</li></>}</ol></nav>;
}

export default function FreeGames() {
  return <PageShell eyebrow="Free learning games" title="Free alphabet, phonics and listening games."
    sub="Small practice sessions for curious learners. Choose a game, play at your own pace, and try again whenever you like. No account or payment required."
    seo={{ title: "Free Alphabet, Phonics & Listening Games | Meet to Manage", description: "Play free alphabet, beginning-letter phonics and listening games for beginners. Short rounds, gentle feedback and optional word audio. No signup required.", path: "/free-games" }}
    jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Free alphabet, phonics and listening games", url: SITE+"/free-games", isAccessibleForFree: true, hasPart: FREE_GAMES.map(g => ({ "@type": "LearningResource", name: g.name, url: SITE+"/free-games/"+g.slug, learningResourceType: "Educational game", isAccessibleForFree: true, inLanguage: "en" })) }}>
    <section lang="en" data-no-translate="true" className="mx-auto max-w-[1140px] px-5 pb-20">
      <Breadcrumb />
      <div className="mb-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#625A53]">{["Free to play", "No signup", "No timer"].map(point => <span key={point} className="inline-flex items-center gap-2"><Check aria-hidden="true" className="h-4 w-4 text-[#C2410C]" />{point}</span>)}</div>
      <GameCards />
      <div className="mt-12 grid gap-8 rounded-3xl bg-[#FFF6EE] p-7 sm:p-10 md:grid-cols-2">
        <div><h2 className="font-display text-2xl font-extrabold tracking-tight">A little practice, together.</h2><p className="mt-4 text-[15px] leading-relaxed text-[#625A53]">Each game has a short round and supportive feedback. A grown-up can help read the instructions, talk about the pictures and decide when to stop. Restart for another set of questions.</p></div>
        <div><h2 className="font-display text-2xl font-extrabold tracking-tight">Simple controls. Optional sound.</h2><p className="mt-4 text-[15px] leading-relaxed text-[#625A53]">Tap or use a keyboard to choose an answer. Audio plays only when you press Listen. The word-sounds game also has a text clue, so you can continue if your device has no speech voice. No microphone is needed.</p></div>
      </div>
      <p className="mt-7 max-w-3xl text-sm leading-relaxed text-[#786B60]">These are short English practice activities, not a full reading course. Teaching online? Explore our <Link to="/solutions/phonics-live-class-software" className="font-semibold text-[#C2410C] underline underline-offset-4">phonics classroom tools</Link> or browse <Link to="/resources" className="font-semibold text-[#C2410C] underline underline-offset-4">free academy templates</Link>.</p>
    </section>
  </PageShell>;
}

export function FreeGamePage({ mode }: { mode: LiteracyGameMode }) {
  const game = FREE_GAMES.find(g => g.mode === mode)!;
  const Icon = game.icon;
  const path = "/free-games/"+game.slug;
  return <PageShell eyebrow="Free learning game" title={game.title}
    seo={{ title: game.seoTitle, description: game.description, path }}
    jsonLd={[{ "@context": "https://schema.org", "@type": "LearningResource", name: game.title, description: game.description, url: SITE+path, learningResourceType: "Educational game", educationalUse: "Practice", inLanguage: "en", isAccessibleForFree: true, provider: { "@type": "Organization", name: "Meet to Manage", url: SITE } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE+"/" }, { "@type": "ListItem", position: 2, name: "Free learning games", item: SITE+"/free-games" }, { "@type": "ListItem", position: 3, name: game.name, item: SITE+path }] }]}
    hero={<section lang="en" data-no-translate="true" className="border-b border-[#F0DDCD] bg-[#FFF6EE] pb-8 pt-7 sm:pb-10 sm:pt-9">
      <div className="mx-auto max-w-[1040px] px-5"><Breadcrumb name={game.name} slug={game.slug} /><div className="flex items-center gap-4"><span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-[#C2410C] sm:flex"><Icon aria-hidden="true" className="h-7 w-7" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-[#A4431B]">Free to play · No signup</p><h1 className="font-display mt-2 text-[clamp(1.65rem,3.4vw,2.6rem)] font-extrabold leading-tight tracking-tight">{game.title}</h1></div></div><p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[#6B625B]">{game.intro}</p></div>
    </section>}>
    <div lang="en" dir="ltr" data-no-translate="true" className="mx-auto max-w-[1040px] px-5 py-8 sm:py-12">
      <section aria-label={game.name+" game"}><LiteracyGame key={mode} mode={mode} /></section>
      <section aria-labelledby="how-to-play" className="mt-12 grid gap-8 md:grid-cols-2">
        <div><h2 id="how-to-play" className="font-display text-2xl font-extrabold tracking-tight">How to play</h2><ol className="mt-5 space-y-4">{game.steps.map((step, i) => <li key={step} className="flex items-start gap-3 text-[15px] leading-relaxed text-[#625A53]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF0E3] text-xs font-bold text-[#C2410C]">{i+1}</span><span>{step}</span></li>)}</ol></div>
        <div className="rounded-2xl bg-[#FFF6EE] p-6"><h2 className="font-display text-xl font-extrabold">For parents and teachers</h2><p className="mt-4 text-sm leading-[1.85] text-[#625A53]">{game.adultNote}</p><p className="mt-4 text-sm leading-relaxed text-[#625A53]">The round score stays in this page while you play. You do not need to create a child profile, and the game does not record your voice.</p></div>
      </section>
      <section aria-labelledby="game-questions" className="mt-10 border-t border-[#EEDACB] pt-8"><h2 id="game-questions" className="font-display text-2xl font-extrabold">Questions about this game</h2><dl className="mt-5 grid gap-6 sm:grid-cols-2">{game.faq.map(f => <div key={f.q}><dt className="font-bold text-[#332C24]">{f.q}</dt><dd className="mt-2 text-sm leading-relaxed text-[#625A53]">{f.a}</dd></div>)}</dl></section>
      <section aria-labelledby="more-games" className="mt-12"><h2 id="more-games" className="font-display mb-6 text-2xl font-extrabold">Try another free game</h2><GameCards exclude={mode} /></section>
      <Link to="/free-games" className={"mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#C2410C] "+FOCUS}><ArrowLeft aria-hidden="true" className="h-4 w-4" />All free games</Link>
    </div>
  </PageShell>;
}

export function AlphabetGamePage() { return <FreeGamePage mode="alphabet" />; }
export function PhonicsGamePage() { return <FreeGamePage mode="phonics" />; }
export function WordSoundsGamePage() { return <FreeGamePage mode="sounds" />; }

