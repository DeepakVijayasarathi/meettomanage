import { useMemo, useState } from "react";
import { AlertOctagon, ShieldOff, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FeeStatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CHILDREN } from "@/data/children";
import { getParentById } from "@/data/users";
import { INVOICES } from "@/data/invoices";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listSuspensions, liftSuspension, type ApiFeeSuspension } from "@/api/billing";
import type { Child } from "@/types";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";

const TODAY = new Date("2026-07-09");

function daysOverdue(dueOn: string) {
  const diff = TODAY.getTime() - new Date(dueOn).getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export default function AdminFeeSuspension() {
  const [statusOverride, setStatusOverride] = useState<Record<string, Child["feeStatus"]>>({});
  const [suspendTarget, setSuspendTarget] = useState<Child | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Child | null>(null);

  const flagged = useMemo(
    () =>
      CHILDREN.filter((c) => {
        const status = statusOverride[c.id] ?? c.feeStatus;
        return status === "overdue" || status === "suspended";
      }),
    [statusOverride]
  );

  function currentStatus(child: Child) {
    return statusOverride[child.id] ?? child.feeStatus;
  }

  function invoiceFor(child: Child) {
    return INVOICES.find((i) => i.childName === child.name && (i.status === "overdue" || i.status === "partial"));
  }

  const { data: suspensions, error: suspensionsError, reload: reloadSuspensions } = useApiData<ApiFeeSuspension[]>(
    () => listSuspensions("Active"),
    []
  );
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [liftError, setLiftError] = useState<string | null>(null);

  async function handleLift(suspension: ApiFeeSuspension) {
    setLiftingId(suspension.id);
    setLiftError(null);
    try {
      await liftSuspension(suspension.id);
      await reloadSuspensions();
    } catch (err) {
      setLiftError(err instanceof Error ? err.message : "Could not restore access. Try again.");
    } finally {
      setLiftingId(null);
    }
  }

  // API mode: real suspensions created by the overdue automation, lifted here or by payment
  if (apiEnabled()) {
    return (
      <div>
        <PageHeader
          eyebrow="Collections"
          title="Fee Suspension"
          description="Accounts suspended by the fee-overdue automation. Access restores automatically on payment, or manually here."
        />

        {suspensionsError && (
          <p className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-sm font-medium text-warning-foreground">
            Could not load suspended accounts ({suspensionsError}).{" "}
            <button type="button" className="underline" onClick={() => reloadSuspensions()}>
              Retry
            </button>
          </p>
        )}
        {liftError && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">{liftError}</p>
        )}

        {suspensions.length === 0 ? (
          <EmptyState icon={ShieldOff} title="No suspended accounts" description="Every account is currently in good standing." />
        ) : (
          <div className="flex flex-col gap-4">
            {suspensions.map((suspension) => (
              <Card key={suspension.id} className="border-destructive/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback>{getInitials(suspension.parentName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{suspension.parentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {suspension.invoiceNumber ? `Invoice ${suspension.invoiceNumber} · ` : ""}
                        Suspended {formatDate(suspension.suspendedAtUtc.slice(0, 10))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <FeeStatusBadge status="suspended" />
                    <Button variant="outline" disabled={liftingId === suspension.id} onClick={() => handleLift(suspension)}>
                      <Undo2 className="h-4 w-4" />
                      {liftingId === suspension.id ? "Restoring…" : "Restore Access"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Fee Suspension"
        description="Accounts with overdue or suspended fee status. Suspend access or restore it as payments are resolved."
      />

      {flagged.length === 0 ? (
        <EmptyState icon={ShieldOff} title="No overdue accounts" description="Every student's fee status is currently in good standing." />
      ) : (
        <div className="flex flex-col gap-4">
          {flagged.map((child) => {
            const status = currentStatus(child);
            const invoice = invoiceFor(child);
            const overdueDays = invoice ? daysOverdue(invoice.dueOn) : null;
            const parent = getParentById(child.parentId);

            return (
              <Card key={child.id} className={status === "suspended" ? "border-destructive/40" : "border-warning/40"}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-11 w-11">
                      <AvatarFallback style={{ backgroundColor: `${child.avatarColor}22`, color: child.avatarColor }}>
                        {getInitials(child.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{child.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Parent: {parent?.name ?? "—"} · {child.grade}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount Due</p>
                      <p className="text-base font-bold text-foreground">{invoice ? formatCurrency(invoice.amount) : "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overdue By</p>
                      <p className="flex items-center justify-end gap-1 text-base font-bold text-destructive">
                        <AlertOctagon className="h-4 w-4" />
                        {overdueDays !== null ? `${overdueDays}d` : "—"}
                      </p>
                    </div>
                    <div>
                      <FeeStatusBadge status={status} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {invoice && <span className="hidden text-xs text-muted-foreground lg:inline">Due {formatDate(invoice.dueOn)}</span>}
                    {status === "suspended" ? (
                      <Button variant="outline" size="sm" onClick={() => setRestoreTarget(child)}>
                        <Undo2 className="h-3.5 w-3.5" />
                        Restore Access
                      </Button>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => setSuspendTarget(child)}>
                        <ShieldOff className="h-3.5 w-3.5" />
                        Suspend Account
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title="Suspend account access?"
        description={suspendTarget ? `${suspendTarget.name} will lose access to classes and resources until fees are cleared.` : undefined}
        confirmLabel="Suspend Account"
        destructive
        onConfirm={() => {
          if (!suspendTarget) return;
          setStatusOverride((prev) => ({ ...prev, [suspendTarget.id]: "suspended" }));
        }}
      />

      <ConfirmDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore access?"
        description={restoreTarget ? `${restoreTarget.name} will regain full access to classes and resources.` : undefined}
        confirmLabel="Restore Access"
        onConfirm={() => {
          if (!restoreTarget) return;
          setStatusOverride((prev) => ({ ...prev, [restoreTarget.id]: "paid" }));
        }}
      />
    </div>
  );
}
