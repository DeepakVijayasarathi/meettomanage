import { useEffect, useRef, useState, type ReactNode } from "react";
import { translateMarketingText } from "@/api/marketing";
import { MARKETING_LOCALES, useMarketingLocale } from "@/lib/i18n";

const SKIP = "script,style,noscript,code,pre,[data-no-translate]";
const translationCache = new Map<string, string>();

export function MarketingTranslationLayer({ children }: { children: ReactNode }) {
  const [locale] = useMarketingLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const originals = useRef(new WeakMap<Text, string>());
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || locale === "en" || locale === "ar") return;
    const rootNode = root;
    let cancelled = false;
    let timer = 0;

    async function translatePage() {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const parent = node.parentElement;
        const value = node.nodeValue?.trim();
        if (!parent || !value || parent.closest(SKIP) || /^[-+\d\s.,:()%₹$€£AED/]+$/.test(value)) continue;
        if (!originals.current.has(node)) originals.current.set(node, value);
        nodes.push(node);
      }
      nodes.forEach((node) => {
        const original = originals.current.get(node)!;
        const cached = translationCache.get(`${locale}\n${original}`);
        if (cached && node.nodeValue?.includes(original)) node.nodeValue = node.nodeValue.replace(original, cached);
      });
      const unique = [...new Set(nodes.map((node) => originals.current.get(node)!).filter((value) => value && !translationCache.has(`${locale}\n${value}`)))];
      if (!unique.length) return;
      setTranslating(true);
      const translated = new Map<string, string>();
      try {
        for (let offset = 0; offset < unique.length; offset += 30) {
          const batch = unique.slice(offset, offset + 30);
          const values = await translateMarketingText(batch, locale);
          batch.forEach((value, index) => {
            const result = values[index] || value;
            translated.set(value, result);
            translationCache.set(`${locale}\n${value}`, result);
          });
        }
        if (cancelled) return;
        nodes.forEach((node) => {
          const original = originals.current.get(node);
          if (original && translated.has(original)) node.nodeValue = node.nodeValue!.replace(original, translated.get(original)!);
        });
      } catch {
        // Keep the original English copy when the translation provider is unavailable.
      } finally {
        if (!cancelled) setTranslating(false);
      }
    }

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void translatePage(), 120);
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(rootNode, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [locale]);

  const language = MARKETING_LOCALES.find((item) => item.code === locale)?.label;
  return (
    <div ref={rootRef}>
      {translating && <div role="status" className="fixed bottom-3 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-black/80 px-3 py-1.5 text-xs font-semibold text-white">Translating to {language}…</div>}
      {children}
    </div>
  );
}
