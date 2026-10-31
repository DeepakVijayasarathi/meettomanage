import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AudioLines, ChevronRight, Building2, CalendarCheck2, CheckCircle2, GraduationCap, Keyboard, Loader2, Mail, MessageSquare, Mic, Send, School, Sparkles, Square, UserRound, Volume2, VolumeX, X, type LucideIcon } from "lucide-react";
import { type Lang } from "@/lib/i18n";
import { askSalesAssistant, requestPlatformDemo, type SalesChatTurn } from "@/api/marketing";
import { apiEnabled } from "@/lib/api";
import { trackChatStarted } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { HERO_BG } from "./styles";

/** The AI sales assistant (text + voice), moved verbatim out of the old Home.tsx. */
/** Mito the assistant, in a round badge. */
function MitoAvatar() {
  return (
    <span aria-hidden className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white p-[3px] shadow-[0_8px_18px_-10px_rgba(194,65,12,0.6)] ring-2 ring-[#FFD2B3]">
      <img src="/product/mito-avatar.webp" alt="" width={192} height={192} className="h-full w-full rounded-full object-cover" />
    </span>
  );
}

const CHAT_T = {
  en: {
    mitoLead: "Meet",
    mitoName: "Mito",
    heading: "Meet to Manage assistant",
    sub: "Ask in any language — type or speak",
    closeAria: "Close chat",
    greeting:
      "Hi! I can answer questions about running your academy, school, tutoring or coaching centre on Meet to Manage — features, pricing, or how a demo works. What would you like to know?",
    audienceLabel: "I run a…",
    audiences: [
      { key: "academy", label: "Academy", question: "I run an academy. How can Meet to Manage help me?" },
      { key: "school", label: "School", question: "I run a school. How can Meet to Manage help us?" },
      { key: "tutor", label: "Tutor", question: "I'm an independent tutor. How can Meet to Manage help me?" },
      { key: "coaching", label: "Coaching centre", question: "I run a coaching centre. How can Meet to Manage help us?" },
    ],
    suggestionsLabel: "Or ask:",
    suggestions: ["How much does it cost?", "What's included?", "Can I see a demo?"],
    placeholder: "Type your question…",
    sendAria: "Send",
    thinking: "Typing…",
    offline: "The assistant isn't available here right now — message us on WhatsApp or email and the team will answer directly.",
    launcher: "Ask",
    launcherName: "Mito",
    teaserHints: [
      "How does it work for a school?",
      "What does a tutor pay per month?",
      "Can my coaching centre run live classes?",
      "How do fee reminders work?",
    ],
    teaserDismissAria: "Dismiss",
    whatsapp: "WhatsApp",
    email: "Email",
    demo: "Request a demo",
    disclaimer: "AI answers can be wrong — the team confirms details on your demo.",
    toggleAria: (open: boolean) => (open ? "Close chat" : "Ask a question"),
    micStart: "Ask by voice",
    micStop: "Stop listening",
    listening: "Listening… speak your question",
    micDenied: "Microphone access was blocked — allow it in your browser, or type your question instead.",
    speakOn: "Read replies aloud",
    speakOff: "Stop reading replies aloud",
    online: "Online · replies in seconds",
    nextCost: "What would it cost me?",
    nextHuman: "Chat with a person on WhatsApp",
    leadCta: "Book my free demo",
    bookPrompt: "I'd like to book a free demo.",
    quickForm: "Or use a quick form",
    leadTitle: "Want to see it with your own classes?",
    leadBody: "Leave your details — our team will WhatsApp you within a day to set up a free demo.",
    leadName: "Your name",
    leadPhone: "WhatsApp number",
    leadEmail: "Email",
    leadOrg: "Academy / school name (optional)",
    leadSending: "Sending…",
    leadLater: "Not now",
    leadRequired: "Please add your name, WhatsApp number and email.",
    leadError: "Couldn't send that — please try again, or message us on WhatsApp.",
    leadDone: (name: string) => `Thanks ${name}! Our team will WhatsApp you within a day to set up your free demo.`,
    leadFallbackOrg: "Via website chat",
    leadTranscript: "Asked in the website chat:",
    unreadAria: "1 new message",
    voiceHi: "Hi! I'm the Meet to Manage AI.",
    voiceAsk: "How can I help you today?",
    voiceGreetingSpoken: "Hi! I'm the Meet to Manage assistant. How can I help you today?",
    talkToMe: "Talk to me",
    typeInstead: "Type instead",
    tryLabel: "Try:",
    voiceIdle: "Tap the mic and ask me anything",
    voiceThinking: "Thinking…",
    voiceSpeaking: "Speaking — tap to interrupt",
    voiceMode: "Switch to voice",
    textMode: "Switch to text chat",
    voiceUnsupported: "Voice isn't available in this browser — try Chrome, Edge or Safari, or type instead.",
    stopSpeaking: "Stop speaking",
  },
  ar: {
    mitoLead: "تعرّف على",
    mitoName: "ميتو",
    heading: "مساعد Meet to Manage",
    sub: "اسأل بأي لغة — اكتب أو تحدّث",
    closeAria: "إغلاق الدردشة",
    greeting:
      "مرحبًا! يمكنني الإجابة عن أسئلتك حول إدارة أكاديميتك أو مدرستك أو دروسك الخصوصية أو مركز التدريب على Meet to Manage — الميزات أو الأسعار أو كيفية العرض التوضيحي. بماذا يمكنني مساعدتك؟",
    audienceLabel: "أنا أدير…",
    audiences: [
      { key: "academy", label: "أكاديمية", question: "أدير أكاديمية. كيف يمكن لـ Meet to Manage مساعدتي؟" },
      { key: "school", label: "مدرسة", question: "أدير مدرسة. كيف يمكن لـ Meet to Manage مساعدتنا؟" },
      { key: "tutor", label: "مدرس خصوصي", question: "أنا مدرس مستقل. كيف يمكن لـ Meet to Manage مساعدتي؟" },
      { key: "coaching", label: "مركز تدريب", question: "أدير مركز تدريب. كيف يمكن لـ Meet to Manage مساعدتنا؟" },
    ],
    suggestionsLabel: "أو اسأل:",
    suggestions: ["كم التكلفة؟", "ما الذي تتضمنه المنصة؟", "هل يمكنني مشاهدة عرض توضيحي؟"],
    placeholder: "اكتب سؤالك…",
    sendAria: "إرسال",
    thinking: "يكتب…",
    offline: "المساعد غير متاح هنا حاليًا — راسلنا على واتساب أو البريد الإلكتروني وسيجيبك الفريق مباشرة.",
    launcher: "اسأل",
    launcherName: "ميتو",
    teaserHints: [
      "كيف تعمل المنصة مع المدارس؟",
      "كم يدفع المدرس الخصوصي شهريًا؟",
      "هل يمكن لمركز التدريب تقديم حصص مباشرة؟",
      "كيف تعمل تذكيرات الرسوم؟",
    ],
    teaserDismissAria: "إغلاق",
    whatsapp: "واتساب",
    email: "البريد",
    demo: "اطلب عرضًا توضيحيًا",
    disclaimer: "قد تخطئ إجابات الذكاء الاصطناعي — يؤكد الفريق التفاصيل خلال العرض التوضيحي.",
    toggleAria: (open: boolean) => (open ? "إغلاق الدردشة" : "اسأل سؤالًا"),
    micStart: "اسأل بالصوت",
    micStop: "إيقاف الاستماع",
    listening: "أستمع… قل سؤالك",
    micDenied: "تم حظر الوصول إلى الميكروفون — اسمح به في المتصفح، أو اكتب سؤالك بدلًا من ذلك.",
    speakOn: "قراءة الردود بصوت عالٍ",
    speakOff: "إيقاف قراءة الردود",
    online: "متصل · يرد خلال ثوانٍ",
    nextCost: "كم ستكون تكلفتي؟",
    nextHuman: "تحدّث مع شخص عبر واتساب",
    leadCta: "احجز عرضي التوضيحي المجاني",
    bookPrompt: "أرغب في حجز عرض توضيحي مجاني.",
    quickForm: "أو استخدم نموذجًا سريعًا",
    leadTitle: "هل تريد رؤيتها مع حصصك الخاصة؟",
    leadBody: "اترك بياناتك — سيتواصل معك فريقنا عبر واتساب خلال يوم لترتيب عرض توضيحي مجاني.",
    leadName: "اسمك",
    leadPhone: "رقم واتساب",
    leadEmail: "البريد الإلكتروني",
    leadOrg: "اسم الأكاديمية أو المدرسة (اختياري)",
    leadSending: "جارٍ الإرسال…",
    leadLater: "ليس الآن",
    leadRequired: "يرجى إدخال اسمك ورقم واتساب والبريد الإلكتروني.",
    leadError: "تعذّر الإرسال — حاول مرة أخرى، أو راسلنا على واتساب.",
    leadDone: (name: string) => `شكرًا ${name}! سيتواصل معك فريقنا عبر واتساب خلال يوم لترتيب العرض التوضيحي المجاني.`,
    leadFallbackOrg: "عبر دردشة الموقع",
    leadTranscript: "أسئلة من دردشة الموقع:",
    unreadAria: "رسالة جديدة واحدة",
    voiceHi: "مرحبًا! أنا مساعد Meet to Manage الذكي.",
    voiceAsk: "كيف يمكنني مساعدتك اليوم؟",
    voiceGreetingSpoken: "مرحبًا! أنا مساعد Meet to Manage. كيف يمكنني مساعدتك اليوم؟",
    talkToMe: "تحدّث معي",
    typeInstead: "اكتب بدلًا من ذلك",
    tryLabel: "جرّب:",
    voiceIdle: "اضغط على الميكروفون واسألني أي شيء",
    voiceThinking: "أفكر…",
    voiceSpeaking: "أتحدث — اضغط للمقاطعة",
    voiceMode: "التبديل إلى الصوت",
    textMode: "التبديل إلى الدردشة النصية",
    voiceUnsupported: "الصوت غير متاح في هذا المتصفح — جرّب Chrome أو Edge أو Safari، أو اكتب بدلًا من ذلك.",
    stopSpeaking: "إيقاف الكلام",
  },
};

const AUDIENCE_ICONS: Record<string, LucideIcon> = {
  academy: GraduationCap,
  school: School,
  tutor: UserRound,
  coaching: Building2,
};

/** The conversation survives a hop to /pricing and back within the same browser session. */
const CHAT_MESSAGES_KEY = "trn.chat.messages";
/** Set once the visitor has booked a demo from the chat, so the booking card isn't offered again. */
const CHAT_LEAD_SENT_KEY = "trn.chat.leadSent";

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeSession(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no storage — the chat just won't carry over to the next page */
  }
}

const EMPTY_LEAD = { name: "", phone: "", email: "", org: "" };

/** The bits of the Web Speech API's SpeechRecognition this widget uses. Not in TypeScript's DOM
 *  lib, and only Chromium/Safari ship it (as webkitSpeechRecognition) — Firefox has none, so the
 *  mic button simply isn't rendered there. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function speechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SPEECH_LANG: Record<Lang, string> = { en: "en-IN", ar: "ar-AE" };

/** Voice follows the visitor's browser locale worldwide. An explicitly selected Arabic page
 * stays Arabic even when the device itself is configured in English. */
function speechLanguage(pageLang: Lang): string {
  if (pageLang === "ar") return SPEECH_LANG.ar;
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return SPEECH_LANG.en;
}

/** Voice names that are female in the common browser and operating-system voice sets, best first. Browsers expose no gender
 *  field, so this is matched by name; a voice whose name is on the male list is never picked. */
const FEMALE_HINTS = [
  "neerja", "heera", "swara", "kalpana", "aria", "jenny", "sonia", "libby", "natasha", "clara", "salma", "zariyah",
  "samantha", "karen", "moira", "tessa", "veena", "fiona", "serena", "susan", "hazel", "zira", "linda", "catherine", "ava", "allison", "joanna", "female",
];
const MALE_HINTS = ["ravi", "hemant", "prabhat", "madhur", "david", "mark", "guy", "ryan", "george", "james", "rishi", "alex", "daniel", "fred", "thomas", "oliver", "male", "hamed", "shakir", "naayf"];

/** The warmest available female voice for a language tag, or null to let the browser choose. Natural, neural and online voices
 *  are preferred over the plain system ones, and a voice in the visitor's own regional accent beats a generic one. */
function pickFemaleVoice(langTag: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const base = langTag.toLowerCase().split("-")[0];
  let best: SpeechSynthesisVoice | null = null;
  let bestScore = 0;
  for (const v of voices) {
    const name = v.name.toLowerCase();
    const vlang = v.lang.toLowerCase().replace("_", "-");
    if (vlang.split("-")[0] !== base) continue;
    if (MALE_HINTS.some((h) => name.includes(h) && !FEMALE_HINTS.some((f) => name.includes(f)))) continue;
    let score = 1;
    if (vlang === langTag.toLowerCase()) score += 3;
    const femaleAt = FEMALE_HINTS.findIndex((h) => name.includes(h));
    if (femaleAt >= 0) score += 10 - Math.min(femaleAt, 9) * 0.1;
    if (/natural|neural|online|enhanced|premium/.test(name)) score += 5;
    if (/google/.test(name) && /female/.test(name)) score += 4;
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}

type Emotion = "happy" | "excited" | "curious" | "caring" | "calm";

/** Reads the mood of one sentence from its wording and punctuation, so the delivery can follow it. */
function emotionOf(sentence: string): Emotion {
  const t = sentence.toLowerCase();
  if (/\b(sorry|unfortunately|apolog|can't|cannot|unable|not available|isn't available|don't have)\b|क्षमा|آسف|للأسف/.test(t)) return "caring";
  if (/!/.test(sentence) || /\b(great|wonderful|amazing|welcome|congrat|fantastic|love|perfect|excellent|happy to)\b/.test(t)) return /!!|\b(amazing|fantastic|congrat)\b/.test(t) ? "excited" : "happy";
  if (/\?\s*$/.test(sentence.trim()) || /؟\s*$/.test(sentence.trim())) return "curious";
  if (/^(hi|hello|hey)\b|\bthank/.test(t)) return "happy";
  return "calm";
}

/** Pitch, speed and loudness for each emotion, on top of a slightly raised, warm base. */
const DELIVERY: Record<Emotion, { pitch: number; rate: number; volume: number }> = {
  happy: { pitch: 1.18, rate: 1.0, volume: 1 },
  excited: { pitch: 1.3, rate: 1.08, volume: 1 },
  curious: { pitch: 1.22, rate: 0.97, volume: 0.95 },
  caring: { pitch: 1.04, rate: 0.9, volume: 0.9 },
  calm: { pitch: 1.1, rate: 0.98, volume: 0.95 },
};

let speakToken = 0;

/** Reads a reply aloud as Mito: a female voice, one sentence at a time, each with its own emotion (happy, excited, curious,
 *  caring or calm) shown through pitch, pace and volume, with a short breath between sentences. Links are dropped from the
 *  spoken text, since a URL read letter by letter helps nobody. `onStart` and `onEnd` drive the orb's speaking animation; `onEnd`
 *  also fires on an error or a cancel, so it never gets stuck. */
function speak(text: string, lang: Lang, events?: { onStart?: () => void; onEnd?: () => void }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const spoken = text.replace(/https?:\/\/[^\s)]+/g, "").replace(/[*•_#`]/g, "").replace(/\s+/g, " ").trim();
  if (!spoken) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const token = ++speakToken;
  const langTag = speechLanguage(lang);
  const voice = pickFemaleVoice(langTag);
  const sentences = spoken.match(/[^.!?؟。]+[.!?؟。]*/g)?.map((x) => x.trim()).filter(Boolean) ?? [spoken];

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    events?.onEnd?.();
  };

  sentences.forEach((sentence, i) => {
    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = voice?.lang ?? langTag;
    if (voice) u.voice = voice;
    const d = DELIVERY[emotionOf(sentence)];
    // Without a recognisably female voice installed, lift the pitch a little more so the voice still reads as feminine.
    u.pitch = Math.min(2, voice ? d.pitch : d.pitch + 0.12);
    u.rate = d.rate;
    u.volume = d.volume;
    if (i === 0) u.onstart = () => { if (token === speakToken) events?.onStart?.(); };
    if (i === sentences.length - 1) u.onend = () => { if (token === speakToken) finish(); };
    u.onerror = () => { if (token === speakToken) finish(); };
    synth.speak(u);
  });
  // A cancel by a newer reply or by closing the chat moves the token on; make sure the old animation still stops.
  window.setTimeout(() => { if (token !== speakToken) finish(); }, 0);
}

// Voices load asynchronously in most browsers: ask early so the first reply already has the right one.
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => window.speechSynthesis.getVoices());
}

type OrbState = "idle" | "listening" | "thinking" | "speaking";

/** The chat's animated AI orb — a turning orange/pink/violet core with a breathing halo. It
 *  pulses quickly while listening, spins fast while thinking, and shows equalizer bars while
 *  speaking. Purely decorative (the state is also spelled out in text next to it). Under
 *  prefers-reduced-motion it simply holds still. */
function AiOrb({ state, size }: { state: OrbState; size: number }) {
  return (
    <span aria-hidden className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 rounded-full bg-[#F97316]/25 motion-safe:animate-orb-breathe"
        style={{ animationDuration: state === "listening" ? "1s" : state === "speaking" ? "1.6s" : "3.2s" }}
      />
      <span
        className="absolute inset-[9%] rounded-full opacity-80 blur-md motion-safe:animate-orb-spin"
        style={{ background: "conic-gradient(from 0deg, #F97316, #F53BA6, #7C5CFC, #F97316)", animationDuration: state === "thinking" ? "1.4s" : "7s" }}
      />
      <span
        className="absolute inset-[15%] rounded-full motion-safe:animate-orb-spin"
        style={{
          background: "conic-gradient(from 120deg, #FB923C, #F53BA6, #8B5CF6, #FB923C)",
          animationDuration: state === "thinking" ? "1s" : "5s",
          animationDirection: "reverse",
        }}
      />
      <span className="absolute inset-[15%] rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(255,255,255,0.75),rgba(255,255,255,0)_55%)]" />
      {state === "speaking" ? (
        <span className="relative flex h-[34%] items-center gap-[6%]" style={{ width: "34%" }}>
          {[0, 120, 240, 360, 120].map((delay, i) => (
            <span
              key={i}
              className="h-full flex-1 rounded-full bg-white motion-safe:animate-orb-wave"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </span>
      ) : state === "listening" ? (
        <Mic className="relative text-white" style={{ width: "30%", height: "30%" }} />
      ) : (
        <Sparkles className="relative text-white/95" style={{ width: "30%", height: "30%" }} />
      )}
    </span>
  );
}

/** Renders an assistant reply as plain text with its URLs made clickable — React elements
 *  only, never injected HTML, since the text comes from a model. */
function ChatText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part.replace(/[.,]+$/, "")} target="_blank" rel="noopener noreferrer" className="break-words font-semibold text-[#C2410C] underline underline-offset-2">
            {part.replace(/^https?:\/\/(www\.)?/, "").replace(/[.,]+$/, "")}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** Floating chat on the homepage: answers a prospective academy's, school's, tutor's or coaching
    centre's questions through the backend's Hetzner AI assistant (POST /api/marketing/chat — the API
    key never reaches the browser) and keeps WhatsApp/email/Request a Demo one tap away
    underneath. Questions can be typed or spoken (browser speech recognition, where supported);
    spoken replies require the visitor to enable audio explicitly. The greeting is local and never sent, so the
    conversation the model sees always opens with the visitor. Separate from the FAQ-matching
    "Ask a Doubt" bot inside the logged-in portals (DoubtChatbot.tsx). */
export function ChatWidget({ lang, openRequest = 0, onOpen }: { lang: Lang; openRequest?: number; onOpen?: () => void }) {
  const t = CHAT_T[lang];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SalesChatTurn[]>(() => readSession<SalesChatTurn[]>(CHAT_MESSAGES_KEY, []));
  const [draft, setDraft] = useState("");
  // Demo booking. While the AI is answering, it books the demo itself: "Book my free demo" asks
  // it to, and it collects name/phone/email in the conversation (book_demo on the backend). The
  // form below is the fallback — shown when the AI is offline or failed, or on request — and
  // posts to the same platform-demo queue as /get-started with the chat questions attached.
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadDismissed, setLeadDismissed] = useState(false);
  const [lead, setLead] = useState(EMPTY_LEAD);
  const [leadStatus, setLeadStatus] = useState<"idle" | "sending" | "error" | "required">("idle");
  const [leadSentName, setLeadSentName] = useState<string | null>(() => readSession<string | null>(CHAT_LEAD_SENT_KEY, null));
  const [pending, setPending] = useState(false);
  const [voiceSupported] = useState(() => speechRecognitionCtor() !== null);
  const [canSpeak] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const speakRepliesRef = useRef(speakReplies);
  speakRepliesRef.current = speakReplies;
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // Voice mode: the chat becomes a talking orb — tap the mic, speak, hear the answer, and it
  // listens again for a follow-up (once; a silent turn ends the loop). The transcript is the
  // same conversation as text mode, so switching back keeps everything.
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [speaking, setSpeaking] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const openRef = useRef(open);
  openRef.current = open;
  // Set when the visitor cuts the AI off (or the mic takes over) — an interrupted reply must not
  // reopen the mic by itself.
  const interruptedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // send() closes over the current messages; the recognizer's callbacks outlive a render, so
  // they call through this ref to always reach the latest one.
  const sendRef = useRef<(text: string, viaVoice?: boolean) => void>(() => {});

  useEffect(() => {
    writeSession(CHAT_MESSAGES_KEY, messages.slice(-30));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, listening, leadOpen, leadSentName]);

  const answered = messages.filter((m) => m.role === "assistant" && !m.failed).length;
  const lastMessage = messages[messages.length - 1];
  const aiAvailable = apiEnabled() && !lastMessage?.failed;
  const offerLead = !leadSentName && !leadDismissed && (leadOpen || (!aiAvailable && answered >= 2));

  function openLead() {
    setLeadDismissed(false);
    setLeadOpen(true);
    setLeadStatus("idle");
  }

  function bookDemo() {
    if (aiAvailable) void send(t.bookPrompt);
    else openLead();
  }

  function recordBooking(name: string) {
    setLeadSentName(name);
    writeSession(CHAT_LEAD_SENT_KEY, name);
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    const name = lead.name.trim();
    if (!name || !lead.phone.trim() || !lead.email.trim()) {
      setLeadStatus("required");
      return;
    }
    const questions = messages.filter((m) => m.role === "user").map((m) => `- ${m.text}`);
    const message = [t.leadTranscript, ...questions].join("\n").slice(0, 1000);
    setLeadStatus("sending");
    try {
      if (apiEnabled()) {
        await requestPlatformDemo({
          fullName: name,
          workEmail: lead.email.trim(),
          phone: lead.phone.trim(),
          academyName: lead.org.trim() || t.leadFallbackOrg,
          message: questions.length ? message : undefined,
        });
      }
      recordBooking(name);
      setLeadOpen(false);
      setLead(EMPTY_LEAD);
      setLeadStatus("idle");
    } catch {
      setLeadStatus("error");
    }
  }

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Never leave the mic on or a reply talking once the chat is closed or the page is left.
  useEffect(() => {
    if (open) return;
    recognitionRef.current?.abort();
    setSpeakReplies(false);
    if (canSpeak) window.speechSynthesis.cancel();
  }, [open, canSpeak]);
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    []
  );

  function openChat(nextMode: "text" | "voice" = "text") {
    if (!open) onOpen?.();
    setMode(nextMode);
    setOpen(true);
  }

  // The hero can open the same assistant without duplicating chat state or UI. A counter is
  // used instead of a boolean so the action still works after the visitor closes and retries.
  useEffect(() => {
    if (openRequest > 0) openChat("text");
    // openChat intentionally uses the latest mode/state; the request counter is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest]);

  /** Speaks a line and runs the orb's speaking state; in voice mode, optionally listens for
   *  the visitor's follow-up as soon as it finishes. */
  function say(text: string, listenAfter = false) {
    if (!canSpeak || !openRef.current || !speakRepliesRef.current) return;
    interruptedRef.current = false;
    speak(text, lang, {
      onStart: () => setSpeaking(true),
      onEnd: () => {
        setSpeaking(false);
        if (listenAfter && !interruptedRef.current && modeRef.current === "voice" && openRef.current) startListening();
      },
    });
  }

  function stopSpeaking() {
    interruptedRef.current = true;
    if (canSpeak) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    openChat();
  }

  async function send(text: string, _viaVoice = false) {
    const question = text.trim().slice(0, 1000);
    if (!question || pending) return;
    const next: SalesChatTurn[] = [...messages, { role: "user", text: question }];
    if (messages.length === 0) trackChatStarted();
    setMessages(next);
    setDraft("");
    setVoiceError(null);
    // Speech is opt-in, including replies to questions dictated with the microphone.
    const readAloud = canSpeak && speakReplies;
    const listenAfter = false;

    if (!apiEnabled()) {
      setMessages([...next, { role: "assistant", text: t.offline }]);
      if (readAloud) say(t.offline);
      return;
    }

    setPending(true);
    try {
      const { reply, bookedName } = await askSalesAssistant(next);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
      if (bookedName) {
        recordBooking(bookedName);
        setLeadOpen(false);
      }
      if (readAloud) say(reply, listenAfter);
    } catch {
      // The API's own error text is generic and English-only; the chat's offline line is
      // localized and points at the contact links right below it.
      setMessages((m) => [...m, { role: "assistant", text: t.offline, failed: true }]);
    } finally {
      setPending(false);
    }
  }
  sendRef.current = send;

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    startListening();
  }

  function startListening() {
    if (recognitionRef.current) return;
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    // Claim the mic before silencing speech: cancelling fires the utterance's end handler,
    // which must see a recognizer already running rather than start a second one.
    recognitionRef.current = recognition;
    stopSpeaking();
    recognition.lang = speechLanguage(lang);
    recognition.interimResults = true;
    recognition.continuous = false;
    let finalText = "";
    recognition.onresult = (event) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setDraft((finalText + interim).trim());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") setVoiceError(t.micDenied);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (finalText.trim()) sendRef.current(finalText, true);
    };
    setVoiceError(null);
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
  }

  const orbState: OrbState = listening ? "listening" : pending ? "thinking" : speaking ? "speaking" : "idle";

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6 rtl:right-auto rtl:left-5 rtl:items-start sm:rtl:left-6">
      {open && (
        <div
          role="dialog"
          aria-label={t.heading}
          className="flex h-[min(680px,calc(100dvh-6rem))] w-[min(410px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-[#EFE3D7] bg-[#FFFAF6] shadow-[0_24px_80px_-24px_rgba(60,35,20,0.3)]"
        >
          <div className="flex items-center gap-3 border-b border-[#EFE3D7] bg-white px-4 py-4 text-[#1C1917]">
            <MitoAvatar />
            <div className="min-w-0 flex-1">
              <p className="font-display truncate text-xl font-extrabold leading-tight tracking-[-0.02em] rtl:tracking-normal">{t.mitoLead} <span className="text-[#C2410C]">{t.mitoName}</span></p>
              <p className="truncate text-xs font-medium text-[#57534E]">{t.heading}</p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-semibold text-[#15803D]"><span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#22C55E]" />{t.online}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                recognitionRef.current?.abort();
                stopSpeaking();
                setMode((m) => (m === "voice" ? "text" : "voice"));
              }}
              aria-label={mode === "voice" ? t.textMode : t.voiceMode}
              title={mode === "voice" ? t.textMode : t.voiceMode}
              className="p-1.5 text-[#6B7280] transition-colors hover:text-[#111]"
            >
              {mode === "voice" ? <Keyboard className="h-4 w-4" /> : <AudioLines className="h-4 w-4" />}
            </button>
            {canSpeak && (
              <button
                type="button"
                onClick={() => {
                  if (speakReplies) stopSpeaking();
                  setSpeakReplies((s) => !s);
                }}
                aria-label={speakReplies ? t.speakOff : t.speakOn}
                aria-pressed={speakReplies}
                title={speakReplies ? t.speakOff : t.speakOn}
                className={cn("p-1.5 transition-colors hover:text-[#111]", speakReplies ? "text-[#EA580C]" : "text-[#6B7280]")}
              >
                {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label={t.closeAria} className="p-1.5 text-[#6B7280] transition-colors hover:text-[#111]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {mode === "voice" ? (
            <VoicePanel
              t={t}
              state={orbState}
              supported={voiceSupported}
              draft={draft}
              lastReply={[...messages].reverse().find((m) => m.role === "assistant")?.text ?? null}
              error={voiceError}
              bookedName={leadSentName}
              onMic={() => {
                if (speaking) stopSpeaking();
                else toggleListening();
              }}
              onKeyboard={() => {
                recognitionRef.current?.abort();
                stopSpeaking();
                setMode("text");
              }}
              onAsk={(q) => send(q, true)}
              disabled={pending}
            />
          ) : (
          <>
          <div ref={scrollRef} aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
            <div className="relative">
              <div className="max-w-[88%] whitespace-pre-line rounded-3xl rounded-es-md border border-[#F6E3D3] bg-white px-4 py-3.5 text-sm leading-relaxed text-[#1C1917] shadow-[0_10px_24px_-18px_rgba(194,65,12,0.4)]">
                {t.greeting}
              </div>
            </div>
            {messages.length === 0 && (
              <>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#57534E]">{t.audienceLabel}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {t.audiences.map((a) => {
                      const Icon = AUDIENCE_ICONS[a.key];
                      return (
                        <button
                          key={a.key}
                          type="button"
                          onClick={() => send(a.question)}
                          className="flex items-center gap-2.5 !rounded-2xl border border-[#F6E3D3] bg-white px-2.5 py-2.5 text-start text-sm font-semibold text-[#1C1917] shadow-[0_8px_18px_-14px_rgba(194,65,12,0.4)] transition-all hover:-translate-y-0.5 hover:border-[#F97316]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-[#FFF1E6] to-[#FFE0CB]"><Icon className="h-[18px] w-[18px] text-[#C2410C]" /></span>
                          <span className="min-w-0 flex-1 truncate">{a.label}</span>
                          <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-[#EA580C] rtl:-scale-x-100" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#57534E]">{t.suggestionsLabel}</p>
                  <div className="flex flex-wrap gap-2">
                    {t.suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => send(s)}
                        className="!rounded-full border border-[#F97316]/50 bg-white px-3.5 py-2 text-[13px] font-semibold text-[#C2410C] transition-colors hover:bg-[#FFF3EA]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="max-w-[85%] self-end whitespace-pre-line rounded-2xl rounded-ee-md bg-[#C2410C] px-3.5 py-2.5 text-sm leading-relaxed text-white">
                  {m.text}
                </div>
              ) : (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] self-start whitespace-pre-line rounded-2xl rounded-es-md border bg-white px-3.5 py-2.5 text-sm leading-relaxed",
                    m.failed ? "border-[#F97316]/40 text-[#57534E]" : "border-[#F6E3D3] text-[#1C1917]"
                  )}
                >
                  <ChatText text={m.text} />
                </div>
              )
            )}
            {pending && (
              <div role="status" aria-label={t.thinking} className="flex items-center gap-1 self-start border border-[#D9E1F0] bg-white px-3.5 py-3.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-[#F97316] motion-safe:animate-bounce"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            )}

            {/* Next steps after an answer: book a demo (the AI takes it from there), price it for
                me, or talk to a person. */}
            {!pending && lastMessage?.role === "assistant" && (
              <div className="flex flex-wrap items-center gap-2">
                {!leadSentName && !offerLead && (
                  <button
                    type="button"
                    onClick={bookDemo}
                    className="flex items-center gap-1.5 bg-[#EA580C] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#C2410C]"
                  >
                    <CalendarCheck2 className="h-3.5 w-3.5" /> {t.leadCta}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => send(t.nextCost)}
                  className="rounded-[10px] border border-[#F97316]/40 bg-white px-3 py-2 text-xs font-semibold text-[#C2410C] transition-colors hover:bg-[#FFF3EA]"
                >
                  {t.nextCost}
                </button>
                <a
                  href="https://wa.me/919344773231"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-[10px] border border-[#D9E1F0] bg-white px-3 py-2 text-xs font-semibold text-[#111] transition-colors hover:border-[#25D366]"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" /> {t.nextHuman}
                </a>
                {aiAvailable && !leadSentName && !offerLead && (
                  <button type="button" onClick={openLead} className="px-1 py-2 text-xs font-semibold text-[#5B6472] underline underline-offset-2 hover:text-[#111]">
                    {t.quickForm}
                  </button>
                )}
              </div>
            )}

            {offerLead && (
              <div className="border border-[#F97316]/50 bg-white p-4 shadow-[0_8px_24px_-12px_rgba(249,115,22,0.35)]">
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#FFF3EA] text-[#EA580C]">
                    <CalendarCheck2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#111]">{t.leadTitle}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#5B6472]">{t.leadBody}</p>
                  </div>
                </div>
                {leadOpen ? (
                  <form onSubmit={submitLead} className="mt-3 flex flex-col gap-2">
                    {(
                      [
                        ["name", t.leadName, "text", "name"],
                        ["phone", t.leadPhone, "tel", "tel"],
                        ["email", t.leadEmail, "email", "email"],
                        ["org", t.leadOrg, "text", "organization"],
                      ] as const
                    ).map(([field, label, type, autoComplete]) => (
                      <input
                        key={field}
                        type={type}
                        autoComplete={autoComplete}
                        value={lead[field]}
                        onChange={(e) => setLead((l) => ({ ...l, [field]: e.target.value }))}
                        placeholder={label}
                        aria-label={label}
                        maxLength={field === "phone" ? 20 : 150}
                        className="h-10 border border-[#D9E1F0] px-3 text-sm text-[#111] outline-none placeholder:text-[#6B7280] focus:border-[#F97316]"
                      />
                    ))}
                    {(leadStatus === "required" || leadStatus === "error") && (
                      <p role="alert" className="text-xs font-medium text-[#B42318]">
                        {leadStatus === "required" ? t.leadRequired : t.leadError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={leadStatus === "sending"}
                      className="flex h-10 items-center justify-center gap-2 bg-[#EA580C] text-sm font-bold text-white transition-colors hover:bg-[#C2410C] disabled:opacity-60"
                    >
                      {leadStatus === "sending" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> {t.leadSending}
                        </>
                      ) : (
                        t.leadCta
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={openLead}
                      className="flex h-10 flex-1 items-center justify-center bg-[#EA580C] text-sm font-bold text-white transition-colors hover:bg-[#C2410C]"
                    >
                      {t.leadCta}
                    </button>
                    <button type="button" onClick={() => setLeadDismissed(true)} className="px-1 py-2 text-xs font-semibold text-[#5B6472] hover:text-[#111]">
                      {t.leadLater}
                    </button>
                  </div>
                )}
              </div>
            )}

            {leadSentName && (
              <div className="flex items-start gap-2 self-start border border-[#22C55E]/40 bg-[#F0FDF4] px-3.5 py-2.5 text-sm leading-relaxed text-[#14532D]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16A34A]" />
                {t.leadDone(leadSentName)}
              </div>
            )}
            {listening && (
              <div className="flex items-center gap-2 self-end text-xs font-semibold text-[#C2410C]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#F97316] opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#F97316]" />
                </span>
                {t.listening}
              </div>
            )}
            {voiceError && <p className="self-end text-xs font-medium text-[#B42318]">{voiceError}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-center gap-2 bg-white px-3 pb-2 pt-3"
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={1000}
              placeholder={listening ? t.listening : t.placeholder}
              aria-label={t.placeholder}
              className="h-12 min-w-0 flex-1 !rounded-2xl border border-[#F0DFD0] bg-[#FFFCFA] px-4 text-sm text-[#1C1917] outline-none placeholder:text-[#6B6560] focus:border-[#F97316]"
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={pending}
                aria-label={listening ? t.micStop : t.micStart}
                aria-pressed={listening}
                title={listening ? t.micStop : t.micStart}
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center !rounded-2xl border transition-colors disabled:opacity-50",
                  listening
                    ? "border-[#F97316] bg-[#FFF3EA] text-[#C2410C]"
                    : "border-[#D9E1F0] bg-white text-[#171B22] hover:border-[#F97316] hover:text-[#C2410C]"
                )}
              >
                {listening ? <Square className="h-3.5 w-3.5" fill="currentColor" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={pending || !draft.trim()}
              aria-label={t.sendAria}
              className="flex h-12 w-12 shrink-0 items-center justify-center !rounded-2xl bg-[#EA580C] text-white shadow-[0_10px_20px_-10px_rgba(234,88,12,0.7)] transition-colors hover:bg-[#C2410C] disabled:opacity-50"
            >
              <Send className="h-4 w-4 rtl:-scale-x-100" />
            </button>
          </form>
          </>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 bg-white px-4 pb-3 pt-1 text-sm font-semibold">
            <a href="https://wa.me/919344773231" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 py-1 text-[#111] hover:text-[#C2410C]">
              <span aria-hidden className="block h-5 w-5 bg-[#25D366] [mask:url(/tool-logos/whatsapp.svg)_center/contain_no-repeat]" /> {t.whatsapp}
            </a>
            <a href="mailto:info@infinityuniquers.com" className="flex items-center gap-1.5 py-1 text-[#111] hover:text-[#C2410C]">
              <Mail className="h-5 w-5 text-[#EA580C]" /> {t.email}
            </a>
            {leadSentName ? (
              <Link to="/get-started" className="ms-auto flex items-center gap-1 py-1 text-[#C2410C] hover:text-[#9A3412]">
                {t.demo} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </Link>
            ) : (
              <button type="button" onClick={bookDemo} disabled={pending} className="ms-auto flex items-center gap-1 py-1 text-[#C2410C] hover:text-[#9A3412] disabled:opacity-50">
                {t.leadCta} <ArrowRight className="h-3.5 w-3.5 rtl:-scale-x-100" />
              </button>
            )}
            <p className="w-full pt-1 text-[11px] font-medium text-[#6B6560]">{t.disclaimer}</p>
          </div>
        </div>
      )}

      {open ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={t.toggleAria(true)}
          aria-expanded
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EA580C] text-white shadow-pop transition-transform hover:scale-105"
        >
          <X className="h-5 w-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-label={t.toggleAria(false)}
          aria-expanded={false}
          className="relative flex h-16 items-center gap-3 rounded-full bg-[#C2410C] p-1.5 text-base text-white shadow-[0_18px_36px_-12px_rgba(234,88,12,0.7)] ring-1 ring-white/30 transition-transform hover:scale-[1.03] sm:pe-6"
        >
          <span className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-white p-[3px] shadow-[0_0_0_4px_rgba(255,255,255,0.35)]">
            <img src="/product/mito-avatar.webp" alt="" width={192} height={192} className={cn("h-full w-full rounded-full object-cover", speaking && "motion-safe:animate-pulse")} />
          </span>
          {/* Label only from sm up: on a phone the full pill covers the page's own buttons. */}
          <span className="relative hidden text-lg font-medium sm:inline">{t.launcher} <b className="font-extrabold">{t.launcherName}</b></span>
        </button>
      )}
    </div>
  );
}

/** The chat body in voice mode: the orb, what it's doing, the live transcript or last answer,
 *  and a big mic button. Same conversation as text mode underneath. */
function VoicePanel({
  t,
  state,
  supported,
  draft,
  lastReply,
  error,
  bookedName,
  onMic,
  onKeyboard,
  onAsk,
  disabled,
}: {
  t: (typeof CHAT_T)[Lang];
  state: OrbState;
  supported: boolean;
  draft: string;
  lastReply: string | null;
  error: string | null;
  bookedName: string | null;
  onMic: () => void;
  onKeyboard: () => void;
  onAsk: (question: string) => void;
  disabled: boolean;
}) {
  const status = !supported
    ? t.voiceUnsupported
    : state === "listening"
      ? t.listening
      : state === "thinking"
        ? t.voiceThinking
        : state === "speaking"
          ? t.voiceSpeaking
          : t.voiceIdle;
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-6 text-center" style={{ background: HERO_BG }}>
      <p aria-live="polite" className="text-xs font-bold uppercase tracking-[0.08em] text-[#C2410C] rtl:tracking-normal">
        {status}
      </p>
      <AiOrb state={state} size={150} />
      <div className="min-h-[3.5rem] w-full">
        {state === "listening" && draft ? (
          <p className="text-base font-semibold leading-snug text-[#111]">“{draft}”</p>
        ) : lastReply ? (
          <p className="max-h-36 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-[#333]">
            <ChatText text={lastReply} />
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {t.suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAsk(q)}
                disabled={disabled}
                className="rounded-[10px] border border-[#F97316]/40 bg-white px-3 py-2 text-xs font-semibold text-[#C2410C] transition-colors hover:bg-[#FFF3EA] disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {bookedName && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#15803D]">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t.leadDone(bookedName)}
          </p>
        )}
        {error && <p className="mt-2 text-xs font-medium text-[#B42318]">{error}</p>}
      </div>
      <div className="mt-auto flex items-center gap-5">
        <button
          type="button"
          onClick={onKeyboard}
          aria-label={t.textMode}
          title={t.textMode}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D9E1F0] bg-white text-[#111] transition-colors hover:border-[#F97316]"
        >
          <Keyboard className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onMic}
          disabled={!supported || state === "thinking"}
          aria-label={state === "listening" ? t.micStop : state === "speaking" ? t.stopSpeaking : t.micStart}
          aria-pressed={state === "listening"}
          className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#EA580C] text-white shadow-[0_12px_30px_-8px_rgba(234,88,12,0.6)] transition-transform hover:scale-105 disabled:opacity-50"
        >
          {state === "listening" && <span aria-hidden className="absolute inset-0 rounded-full bg-[#EA580C]/40 motion-safe:animate-ping" />}
          {state === "listening" || state === "speaking" ? (
            <Square className="relative h-6 w-6" fill="currentColor" />
          ) : state === "thinking" ? (
            <Loader2 className="relative h-7 w-7 animate-spin" />
          ) : (
            <Mic className="relative h-7 w-7" />
          )}
        </button>
        <span className="h-11 w-11" aria-hidden />
      </div>
    </div>
  );
}
