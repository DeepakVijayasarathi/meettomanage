import { PageHeader } from "@/components/PageHeader";
import WebinarCatalog from "./WebinarCatalog";

export default function MarketingWebinars() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Webinars" description="Create and publish webinars, share registration pages, and host live sessions on Jitsi." />
      <WebinarCatalog />
    </div>
  );
}
