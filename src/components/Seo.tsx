import { Helmet } from "react-helmet-async";

const SITE_URL = "https://meettomanage.cloud";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SeoProps {
  title: string;
  description: string;
  /** Path only, e.g. "/blog/five-signs" — combined with SITE_URL for canonical/OG urls. */
  path: string;
  image?: string;
  type?: "website" | "article";
}

/** Per-route title, description, canonical and social-share tags (index.html carries the site-wide defaults a crawler sees before JS runs). */
export function Seo({ title, description, path, image = DEFAULT_IMAGE, type = "website" }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
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
