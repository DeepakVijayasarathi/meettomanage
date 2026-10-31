import { Loader2, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { InlineAlert } from "@/components/InlineAlert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { applySeoOverrides } from "@/lib/seoSettings";
import { useMarketingSettings } from "./useMarketingSettings";

/** One row per public page — key prefix, display label, and a live link. */
const SEO_PAGES = [
  { key: "home", label: "Landing Page", path: "/" },
  { key: "pricing", label: "Pricing", path: "/pricing" },
  { key: "store", label: "Course Catalogue", path: "/store" },
  { key: "demo", label: "Class Demo Page", path: "/demo" },
  { key: "getStarted", label: "Platform Demo Request", path: "/get-started" },
  { key: "blog", label: "Blog", path: "/blog" },
] as const;

/** Same fallbacks each page's own <Seo> passes, shown until a value is saved. */
const SEO_DEFAULTS: Record<string, string> = {
  "seo.home.title": "Coaching Centre Management Software | Meet to Manage",
  "seo.home.description": "Manage live classes, admissions, fees and parent updates in one platform built for tuition, abacus and phonics centres. Book a free demo.",
  "seo.pricing.title": "Pricing: Academy Management Software Plans | Meet to Manage",
  "seo.pricing.description": "One simple price per academy with live classes, admissions, automatic fee collection and a parent app included. Pay monthly or yearly. Book a free demo.",
  "seo.store.title": "Live Online Courses & Free Demo Classes | Meet to Manage",
  "seo.store.description": "Browse live online courses and book a free demo class in minutes. No account needed. Meet the teacher and try the live classroom before you enrol.",
  "seo.demo.title": "Book a Free Live Demo Class | Meet to Manage",
  "seo.demo.description": "Book a free live demo class and see how lessons run in the Meet to Manage virtual classroom, with whiteboard, quizzes and recordings. No account needed.",
  "seo.getStarted.title": "Book a Free Platform Demo for Your Academy | Meet to Manage",
  "seo.getStarted.description": "See live classes, admissions, fee collection and the parent app working together for your academy or coaching centre. Book a free 30-minute demo today.",
  "seo.blog.title": "Academy Growth & Management Blog | Meet to Manage",
  "seo.blog.description": "Practical guides for coaching centres and online academies on admissions, fee collection, scheduling, parent communication and student retention.",
};

export default function MarketingSeo() {
  const { values, setValue, save, saving, loading, error } = useMarketingSettings(SEO_DEFAULTS);

  return (
    <div>
      <PageHeader
        eyebrow="Website"
        title="SEO"
        description="What search engines and shared links show for each public page — the browser tab title, the snippet under a Google result, and the preview when a link is shared on WhatsApp or social media."
        actions={
          <Button onClick={() => save(applySeoOverrides)} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        }
      />
      {error && (
        <InlineAlert variant="error" bordered className="mb-4">
          {error}
        </InlineAlert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Page titles & descriptions</CardTitle>
          <CardDescription>Blog posts have their own titles, set per post on the Blog Posts screen.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {SEO_PAGES.map(({ key, label, path }) => (
            <div key={key} className="grid grid-cols-1 gap-4 py-5 first:pt-0 last:pb-0 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <a href={path} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                  {path}
                </a>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`seo-${key}-title`}>Page title</Label>
                <Input
                  id={`seo-${key}-title`}
                  value={values[`seo.${key}.title`] ?? ""}
                  maxLength={120}
                  onChange={(e) => setValue(`seo.${key}.title`, e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`seo-${key}-description`}>Description</Label>
                <Textarea
                  id={`seo-${key}-description`}
                  rows={2}
                  maxLength={320}
                  value={values[`seo.${key}.description`] ?? ""}
                  onChange={(e) => setValue(`seo.${key}.description`, e.target.value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
