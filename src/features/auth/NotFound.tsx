import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/Seo";
import { useBrand } from "@/lib/branding";
import { useLightBrandScope } from "@/lib/theme";

export default function NotFound() {
  // A light-design page (cream background), like login: keep it light in dark mode too.
  useLightBrandScope();
  const brand = useBrand();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#FFF6EE] px-6 text-center">
      {/* nginx serves index.html (HTTP 200) for every unknown path so client-side routing
          survives a refresh — this route is the only signal a crawler gets that the URL
          doesn't actually resolve, so it needs its own noindex rather than inheriting
          whatever title/description the previous page (or index.html's own defaults) left behind. */}
      <Seo
        title={`Page Not Found — ${brand.name}`}
        description="The page you're looking for doesn't exist or has moved."
        path="/404"
        noindex
      />
      <Logo wordmarkClassName="mix-blend-multiply" />
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="h-8 w-8" />
      </span>
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">404 — Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
      </div>
      {/* Most 404s are visitors from an old link or a typo, not signed-in users, so lead with the homepage. */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/">Go to homepage</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/portal-select">My portal</Link>
        </Button>
      </div>
    </div>
  );
}
