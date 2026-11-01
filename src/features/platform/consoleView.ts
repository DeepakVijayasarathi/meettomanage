import { useEffect, useState } from "react";

/** Simple shows the everyday operator pages; Advanced shows every console page. */
export type ConsoleView = "simple" | "advanced";

const KEY = "mtm.platformConsoleView";
const EVENT = "mtm-platform-console-view";

export function readConsoleView(): ConsoleView {
  try {
    return localStorage.getItem(KEY) === "advanced" ? "advanced" : "simple";
  } catch {
    return "simple";
  }
}

/** The operator's chosen console view, remembered in this browser and kept in step across open tabs. */
export function useConsoleView(): [ConsoleView, (view: ConsoleView) => void] {
  const [view, setView] = useState<ConsoleView>(readConsoleView);
  useEffect(() => {
    const sync = () => setView(readConsoleView());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const change = (next: ConsoleView) => {
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked: applies to this page only */ }
    setView(next);
    window.dispatchEvent(new Event(EVENT));
  };
  return [view, change];
}
