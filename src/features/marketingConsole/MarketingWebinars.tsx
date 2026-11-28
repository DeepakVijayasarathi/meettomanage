import { PageHeader } from "@/components/PageHeader";
import WebinarCatalog from "./WebinarCatalog";

export default function MarketingWebinars() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Audience growth" title="Webinars" description="Plan events, monitor registrations, share landing pages, and host live sessions from one workspace." />
      <WebinarCatalog />
    </div>
  );
}
