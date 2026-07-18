import { Lock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/state/session";
import { IntegrationsManager } from "@/features/admin/Settings";

/**
 * Sub Admin's own Integrations screen — same editor the Admin portal uses, shown
 * here so a Relationship Manager granted Settings access isn't stuck with the
 * permission but no page to use it on. Read/write behavior is identical; only
 * visibility differs, gated the same way as everything else on this portal.
 */
export default function SubAdminIntegrations() {
  const { hasPermission } = useSession();

  return (
    <div>
      <PageHeader
        eyebrow="Access Control"
        title="Integrations"
        description="Third-party services — Email, WhatsApp, payment gateways, video conferencing — configured for the whole platform."
      />

      {hasPermission("Settings", "View") ? (
        <IntegrationsManager />
      ) : (
        <EmptyState
          icon={Lock}
          title="No access to Integrations"
          description="Ask your Admin to grant Settings access from Roles & Permissions if you need to manage third-party integrations."
        />
      )}
    </div>
  );
}
