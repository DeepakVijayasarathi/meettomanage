/**
 * Client-side mirror of ChatbotService.FindBestMatch on the backend — only used in demo mode
 * (no API to ask), so the "Ask a Doubt" widget still answers from the mock FAQ list. Scores
 * each FAQ by how many of its question/keyword tokens overlap with the asked question.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "do", "does", "did", "i", "my", "me", "how", "what", "when",
  "where", "why", "to", "for", "of", "in", "on", "at", "can", "will", "need", "want", "please",
  "help", "about", "you", "your", "it", "this", "that", "and", "or", "with",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .split(/[\s,.?!:;'"]+/)
      .map((t) => t.toLowerCase())
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  );
}

/** Classic DP edit distance — small inputs only (single tokens), so O(n*m) is fine. */
function levenshteinDistance(a: string, b: string): number {
  const distances: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) distances[i][0] = i;
  for (let j = 0; j <= b.length; j++) distances[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(distances[i - 1][j] + 1, distances[i][j - 1] + 1, distances[i - 1][j - 1] + cost);
    }
  }

  return distances[a.length][b.length];
}

function maxEditDistanceFor(wordLength: number): number {
  if (wordLength <= 4) return 0;
  if (wordLength <= 7) return 1;
  return 2;
}

/**
 * True on an exact token match, or a "close enough" one — a typo like "schdule" for
 * "schedule" would otherwise never overlap at all, even though a human reads it as the
 * obvious same word. Mirrors ChatbotService.TokenMatches on the backend.
 */
function tokenMatches(askedToken: string, faqTokens: Set<string>): boolean {
  if (faqTokens.has(askedToken)) return true;

  const maxDistance = maxEditDistanceFor(askedToken.length);
  if (maxDistance === 0) return false;

  for (const faqToken of faqTokens) {
    if (Math.abs(faqToken.length - askedToken.length) <= maxDistance && levenshteinDistance(askedToken, faqToken) <= maxDistance) {
      return true;
    }
  }
  return false;
}

/** Mirrors ChatbotService.SmallTalkReplies on the backend, checked in order. */
const SMALL_TALK_REPLIES: { triggers: string[]; reply: string }[] = [
  {
    triggers: ["hi", "hii", "hey", "hello", "helo", "hlo", "yo", "good morning", "good afternoon", "good evening"],
    reply: "Hi! How can I help with your doubt today?",
  },
  { triggers: ["thanks", "thank you", "thankyou", "thx", "ty"], reply: "You're welcome! Let me know if you have any other doubts." },
  { triggers: ["bye", "goodbye", "good bye", "see you", "cya"], reply: "Bye! Come back anytime you have a doubt." },
  {
    triggers: ["how are you", "how r u", "hows it going", "how's it going"],
    reply: "I'm doing well, thanks for asking! What doubt can I help you with?",
  },
  {
    triggers: ["help", "what can you do", "who are you"],
    reply:
      "I can answer common questions about classes, fees, login, recordings, attendance and more. If I don't know something, I'll forward it to a teacher so they can help directly.",
  },
];

/**
 * Recognizes a short greeting/smalltalk turn so it gets a friendly reply instead of being
 * treated as an unanswerable doubt. Mirrors ChatbotService.FindSmallTalkReply — only short
 * inputs qualify, so "hi, how do I pay my fees?" still falls through to real FAQ matching.
 */
export function findSmallTalkReply(question: string): string | null {
  const normalized = question.trim().toLowerCase().replace(/[!?.,]+$/, "");
  if (normalized.split(/\s+/).filter(Boolean).length > 4) return null;

  for (const { triggers, reply } of SMALL_TALK_REPLIES) {
    for (const trigger of triggers) {
      if (normalized === trigger || normalized.startsWith(`${trigger} `)) return reply;
    }
  }
  return null;
}

export interface MatchableFaq {
  id: string;
  question: string;
  keywords: string | null;
}

/** Returns the best-scoring active FAQ for a question, or null if nothing scores above 0. */
export function findBestFaqMatch<T extends MatchableFaq>(question: string, faqs: T[]): T | null {
  const askedTokens = tokenize(question);
  if (askedTokens.size === 0) return null;

  let best: T | null = null;
  let bestScore = 0;

  for (const faq of faqs) {
    const faqTokens = new Set([...tokenize(faq.question), ...tokenize(faq.keywords ?? "")]);
    let score = 0;
    for (const token of askedTokens) {
      if (tokenMatches(token, faqTokens)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore >= 1 ? best : null;
}
