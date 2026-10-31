import { useEffect, useRef, type ReactNode } from "react";
import { useMarketingLocale } from "@/lib/i18n";

const SKIP = "script,style,noscript,code,pre,[data-no-translate]";

/** English text -> translation, one bundled file per locale, loaded only when that locale is used.
 *  Files live in src/i18n/locales and are generated against scripts/i18n-strings.json. */
const loaders = import.meta.glob<{ default: Record<string, string> }>("../i18n/locales/*.json");
const dictionaries = new Map<string, Promise<Record<string, string>>>();

function loadDictionary(locale: string): Promise<Record<string, string>> {
  let pending = dictionaries.get(locale);
  if (!pending) {
    const load = loaders[`../i18n/locales/${locale}.json`];
    pending = load ? load().then((m) => m.default).catch(() => ({})) : Promise.resolve({});
    dictionaries.set(locale, pending);
  }
  return pending;
}

export function MarketingTranslationLayer({ children }: { children: ReactNode }) {
  const [locale] = useMarketingLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const originals = useRef(new WeakMap<Text, string>());
  // Nodes currently showing a translation, so switching language can put the English back first.
  const applied = useRef(new Map<Text, { original: string; translated: string }>());

  useEffect(() => {
    const root = rootRef.current;
    if (!root || locale === "en" || locale === "ar") return;
    const rootNode = root;
    let cancelled = false;
    let timer = 0;
    let dictionary: Record<string, string> | null = null;

    function translatePage() {
      if (!dictionary) return;
      const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const parent = node.parentElement;
        const value = node.nodeValue?.trim();
        if (!parent || !value || parent.closest(SKIP) || /^[-+\d\s.,:()%₹$€£AED/]+$/.test(value)) continue;
        const known = originals.current.get(node);
        // React may have re-rendered this node with fresh English text; anything that isn't our translation is the new original.
        if (known === undefined || (value !== known && value !== dictionary[known])) originals.current.set(node, value);
        const original = originals.current.get(node)!;
        const translated = dictionary[original];
        // Strings without an entry stay in English rather than showing a wrong guess.
        if (translated && node.nodeValue!.includes(original)) {
          node.nodeValue = node.nodeValue!.replace(original, translated);
          applied.current.set(node, { original, translated });
        }
      }
    }

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(translatePage, 60);
    };
    // Our own text edits re-trigger the observer; translatePage is idempotent, so the extra pass is a no-op.
    const observer = new MutationObserver(schedule);
    void loadDictionary(locale).then((loaded) => {
      if (cancelled) return;
      dictionary = loaded;
      translatePage();
      observer.observe(rootNode, { childList: true, subtree: true, characterData: true });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      observer.disconnect();
      applied.current.forEach(({ original, translated }, node) => {
        if (node.isConnected && node.nodeValue?.includes(translated)) node.nodeValue = node.nodeValue.replace(translated, original);
      });
      applied.current.clear();
    };
  }, [locale]);

  return <div ref={rootRef}>{children}</div>;
}
