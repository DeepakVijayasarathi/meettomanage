import { Helmet } from "react-helmet-async";
import { useSeoOverride } from "@/lib/seoSettings";

const SITE_URL = "https://meettomanage.cloud";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SeoProps {
  /** Admin Settings → SEO key this page reads overrides from (e.g. "home", "blog"). Omit for a page with no admin override — blog posts, which already have their own admin-editable title/excerpt. */
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
