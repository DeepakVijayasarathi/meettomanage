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
      if (faqTokens.has(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = faq;
    }
  }

  return bestScore >= 1 ? best : null;
}
