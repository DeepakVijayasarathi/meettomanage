import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { SessionProvider } from "@/state/session";
import { ErrorBoundary, RELOAD_GUARD_KEY } from "@/components/ErrorBoundary";
import { applyBranding, loadBrandingFromApi } from "@/lib/branding";
import { loadSeoSettingsFromApi } from "@/lib/seoSettings";
import { applyInitialTheme } from "@/lib/theme";
import { HelmetProvider } from "react-helmet-async";
import { applyInitialLang } from "@/lib/i18n";
import { stripFreshReloadParam, tryAutoReloadFresh } from "@/lib/freshReload";
import { clearAuthStorage } from "@/lib/authStorage";
import { discoverHostTenant, hasTenantSessionMismatch, setSessionTenant } from "@/lib/tenantPath";
import "@/index.css";

// Vite fires this when a lazy route's JS or CSS can't be preloaded - i.e. this tab holds an older
// build than the server now has. Fetch the current build before the route even tries to render.
window.addEventListener("vite:preloadError", () => {
  tryAutoReloadFresh();
});
stripFreshReloadParam();

async function start() {
  // localStorage is shared by every tenant path and custom hostname. Resolve a
  // verified host before SessionProvider or public branding reads tenant state.
  const discovered = await discoverHostTenant();
  if (hasTenantSessionMismatch() || discovered.mismatch) clearAuthStorage();
  if (discovered.code) setSessionTenant(discovered.code);

  applyBranding();
  void loadBrandingFromApi();
  void loadSeoSettingsFromApi();
// Re-applies the same "trn.theme" value index.html's inline script already used —
// idempotent, just keeps this module's state and the DOM class in agreement.
applyInitialTheme();
// Same idempotent re-apply for language/direction — see index.html's inline script.
applyInitialLang();

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
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </SessionProvider>
    </ErrorBoundary>
  </StrictMode>
  );
}

void start();
