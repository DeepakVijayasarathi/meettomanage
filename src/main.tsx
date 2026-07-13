import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { SessionProvider } from "@/state/session";
import { applyBranding, loadBrandingFromApi } from "@/lib/branding";
import "@/index.css";

applyBranding();
void loadBrandingFromApi();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>
);
