import { ExternalLink, Loader2, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ANALYTICS_ID_PATTERNS, ANALYTICS_KEYS } from "@/lib/analytics";
import { useMarketingSettings } from "./useMarketingSettings";

const DEFAULTS: Record<string, string> = {
  [ANALYTICS_KEYS.ga]: "",
  [ANALYTICS_KEYS.gtm]: "",
  [ANALYTICS_KEYS.pixel]: "",
};

const TAGS = [
  {
    id: "ga" as const,
    key: ANALYTICS_KEYS.ga,
    label: "Google Analytics 4 — Measurement ID",
    placeholder: "G-XXXXXXXXXX",
    help: "GA4 → Admin → Data streams → your web stream. Visitors, sources and conversions show in your GA dashboard.",
    dashboard: "https://analytics.google.com/",
    dashboardLabel: "Open Google Analytics",
    format: "Starts with G-",
  },
  {
    id: "gtm" as const,
    key: ANALYTICS_KEYS.gtm,
    label: "Google Tag Manager — Container ID",
    placeholder: "GTM-XXXXXXX",
    help: "Optional, for managing Google Ads conversion tags and other tags yourself. Each marketing page also pushes a marketing_page_view event.",
    dashboard: "https://tagmanager.google.com/",
    dashboardLabel: "Open Tag Manager",
    format: "Starts with GTM-",
  },
  {
    id: "pixel" as const,
    key: ANALYTICS_KEYS.pixel,
    label: "Meta Pixel ID",
    placeholder: "123456789012345",
    help: "Meta Events Manager → Data sources. Lets Facebook/Instagram ads measure and retarget website visitors.",
    dashboard: "https://business.facebook.com/events_manager2",
    dashboardLabel: "Open Events Manager",
    format: "Digits only",
  },
];

export default function MarketingAnalytics() {
  const { values, setValue, save, saving, loading, error } = useMarketingSettings(DEFAULTS);
  const invalid = TAGS.filter((t) => {
    const value = values[t.key]?.trim();
    return value && !ANALYTICS_ID_PATTERNS[t.id].test(value);
  });

  return (
    <div>
      <PageHeader
        eyebrow="Website"
        title="Tracking tags"
        description="Optional: also send visits to Google Analytics, Tag Manager or Meta (for ads). The Dashboard works without any of these. Tags load on the public marketing pages only (home, pricing, blog, demo pages) — never on the login or academy portals. Leave a field blank to switch that tag off."
        actions={
          <Button onClick={() => save()} disabled={saving || loading || invalid.length > 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        }
      />
      {error && (
        <InlineAlert variant="error" bordered className="mb-4">
          {error}
        </InlineAlert>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {TAGS.map((tag) => {
          const value = values[tag.key] ?? "";
          const bad = invalid.includes(tag);
          return (
            <Card key={tag.key}>
              <CardHeader>
                <CardTitle className="text-base">{tag.label}</CardTitle>
                <CardDescription>{tag.help}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={tag.key} className="sr-only">
                    {tag.label}
                  </Label>
                  <Input
                    id={tag.key}
                    value={value}
                    placeholder={tag.placeholder}
                    onChange={(e) => setValue(tag.key, e.target.value.trim().toUpperCase())}
                    aria-invalid={bad}
                  />
                  {bad && <p className="text-xs font-medium text-destructive">Doesn&apos;t look right — {tag.format}.</p>}
                </div>
                <a
                  href={tag.dashboard}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  {tag.dashboardLabel} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
