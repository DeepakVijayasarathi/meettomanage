import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { beginViewAsStorage, authStorage } from "@/lib/authStorage";
import { setAccessToken } from "@/lib/api";
import { setUserTimeZone } from "@/lib/datetime";
import { useLightBrandScope } from "@/lib/theme";
import { VIEW_AS_READY, VIEW_AS_SESSION, type ViewAsSessionMessage } from "@/lib/viewAs";

/**
 * The tab a "View as parent" click opens (see lib/viewAs.ts). It receives the read-only
 * session from the Relationship Manager's tab, stores it in this tab only, then loads the
 * parent portal. Also the landing page once that session ends (`?ended=1`).
 */
export default function ViewAsHandoff() {
  useLightBrandScope();
  const [params] = useSearchParams();
  const ended = params.get("ended") === "1";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (ended) return;
    const opener = window.opener as Window | null;
    if (!opener) {
      setFailed(true);
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== opener || event.origin !== window.location.origin || event.data?.type !== VIEW_AS_SESSION) return;
      const { response } = event.data as ViewAsSessionMessage;
      const parentName = `${response.user.firstName} ${response.user.lastName}`.trim();

      beginViewAsStorage({ parentName, expiresAtUtc: response.expiresAtUtc });
      // Same keys SessionProvider reads on load (authStorage() is this tab's sessionStorage now).
      setAccessToken(response.accessToken);
      authStorage().setItem("trn.role", "parent");
      authStorage().setItem("trn.homePath", "/parent");
      authStorage().setItem("trn.userName", parentName);
      authStorage().setItem("trn.permissions", JSON.stringify(response.permissions));
      setUserTimeZone(response.user.timeZoneId ?? null);
      window.location.replace("/parent");
    };
    window.addEventListener("message", onMessage);

    const say = () => opener.postMessage({ type: VIEW_AS_READY }, window.location.origin);
    say();
    const repeat = setInterval(say, 500);
    const giveUp = setTimeout(() => {
      clearInterval(repeat);
      setFailed(true);
    }, 20_000);

    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(repeat);
      clearTimeout(giveUp);
    };
  }, [ended]);

  const done = ended || failed;
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        {done ? (
          <>
            <EyeOff className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">{ended ? "Parent view closed" : "Couldn't open the parent view"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {ended
                ? "This read-only session has ended. You can close this tab."
                : "Close this tab and click View as parent again from the Users page."}
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Opening the parent's portal (read-only)…</p>
          </>
        )}
      </div>
    </div>
  );
}
