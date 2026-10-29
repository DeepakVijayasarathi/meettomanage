import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSeoOverride } from "@/lib/seoSettings";
import { trackMarketingPageView } from "@/lib/analytics";

const SITE_URL = "https://meettomanage.cloud";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SeoProps {
  /** Marketing console → SEO key this page reads overrides from (e.g. "home", "blog"). Omit for a page with no admin override — blog posts, which already have their own admin-editable title/excerpt. */
  pageKey?: string;
  title: string;
  description: string;
  /** Path only, e.g. "/blog/five-signs" — combined with SITE_URL for canonical/OG urls. */
  path: string;
  image?: string;
  type?: "website" | "article";
  /** Set on routes with no real content of their own (404) so a crawler that renders the
   *  JS doesn't index them under the previous page's — or index.html's default — title. */
  noindex?: boolean;
}

/** Per-route title, description, canonical and social-share tags (index.html carries the site-wide defaults a crawler sees before JS runs). */
export function Seo({ pageKey, title: titleFallback, description: descriptionFallback, path, image = DEFAULT_IMAGE, type = "website", noindex = false }: SeoProps) {
  const title = useSeoOverride(pageKey ?? "", "title", titleFallback);
  const description = useSeoOverride(pageKey ?? "", "description", descriptionFallback);
  const url = `${SITE_URL}${path}`;

  // One analytics page view per marketing page (only public marketing pages render <Seo>).
  // Keyed on path alone: the title can update a moment later once SEO overrides load, and
  // that mustn't count as a second view. Skipped for the 404 page.
  const titleRef = useRef(title);
  titleRef.current = title;
  useEffect(() => {
    if (!noindex) void trackMarketingPageView(path, titleRef.current);
  }, [path, noindex]);

  // index.html ships site-wide default tags for crawlers that don't run JavaScript. Once a page declares its own,
  // two canonicals (or two descriptions) would conflict, so the defaults are dropped; Helmet's own tags carry data-rh.
  useEffect(() => {
    document.head
      .querySelectorAll('link[rel="canonical"]:not([data-rh]), meta[name="description"]:not([data-rh]), meta[property^="og:"]:not([data-rh]), meta[name^="twitter:"]:not([data-rh])')
      .forEach((el) => el.remove());
  }, [path, title, description]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Meet to Manage" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
