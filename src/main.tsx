import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { SessionProvider } from "@/state/session";
import { ErrorBoundary, RELOAD_GUARD_KEY } from "@/components/ErrorBoundary";
import { applyBranding, loadBrandingFromApi } from "@/lib/branding";
import { applyInitialTheme } from "@/lib/theme";
import "@/index.css";

applyBranding();
void loadBrandingFromApi();
// Re-applies the same "trn.theme" value index.html's inline script already used —
// idempotent, just keeps this module's state and the DOM class in agreement.
applyInitialTheme();

// Reaching this line means the app just mounted successfully — clear ErrorBoundary's
// one-shot auto-reload guard so a *future* stale-chunk error (after some later deploy,
// same tab never closed) still gets its own single automatic reload rather than being
// silently blocked by a guard flag left over from a much earlier occurrence.
try {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
} catch {
  /* sessionStorage unavailable — nothing to clear */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ErrorBoundary>
  </StrictMode>
);
