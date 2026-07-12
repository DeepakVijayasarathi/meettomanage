import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { SessionProvider } from "@/state/session";
import { applyBranding } from "@/lib/branding";
import "@/index.css";

applyBranding();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <App />
    </SessionProvider>
  </StrictMode>
);
