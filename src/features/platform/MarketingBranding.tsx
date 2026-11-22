import { useEffect, useState } from "react";
import { marketingBranding, marketingLogoUrl } from "@/api/branding";
import { LogoField } from "@/components/BrandingFields";
import PlatformShell, { usePlatformAdmin } from "./PlatformShell";
import { Hero, Notices, panel } from "./saasUi";

export default function MarketingBranding() {
  return <PlatformShell><MarketingBrandingForm /></PlatformShell>;
}

function MarketingBrandingForm() {
  const { token } = usePlatformAdmin();
  const [logoUrl, setLogoUrl] = useState<string>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void marketingBranding.get(token, controller.signal)
      .then(({ logoPath }) => setLogoUrl(logoPath ? marketingLogoUrl(logoPath) : ""))
      .catch(err => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load the marketing logo.");
      });
    return () => controller.abort();
  }, [token]);

  return <div className="space-y-6">
    <Hero title="Marketing branding" text="Upload the logo for the marketing site and the Marketing Console sidebar." />
    <Notices error={error} notice={notice} />
    <section className={`${panel} p-6`}>
      {logoUrl === undefined
        ? !error && <p role="status" className="text-sm text-muted-foreground">Loading marketing branding…</p>
        : <LogoField logoUrl={logoUrl} fallbackSrc={null}
            onUpload={async file => {
              setNotice("");
              const { logoPath } = await marketingBranding.upload(token, file);
              setLogoUrl(marketingLogoUrl(logoPath));
              setNotice("Marketing logo published.");
            }}
            onRemove={async () => {
              setNotice("");
              await marketingBranding.remove(token);
              setLogoUrl("");
              setNotice("Marketing logo removed.");
            }} />}
    </section>
  </div>;
}
