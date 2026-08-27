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
