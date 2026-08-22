import { useMemo, useState } from "react";
import { CalendarClock, CreditCard, Loader2, PackagePlus, Pencil, PlayCircle, RefreshCw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiData } from "@/api/hooks";
import { apiEnabled } from "@/lib/api";
import {
  cancelSubscription,
  createPackagePlan,
  createSubscription,
  listPackagePlans,
  listSubscriptions,
  renewSubscription,
  updatePackagePlan,
  type ApiBillingCycle,
  type ApiBillingType,
  type ApiPackagePlan,
  type ApiSubscription,
} from "@/api/billing";
import { listCourseOptions, type ApiCourseOption } from "@/api/courses";
import { listStudents, type StudentRow } from "@/api/users";
import { formatCurrency, formatDate } from "@/lib/utils";

const BILLING_TYPES: { value: ApiBillingType; label: string }[] = [
  { value: "Subscription", label: "Subscription (recurring)" },
  { value: "SessionBased", label: "Session-based" },
  { value: "OneTime", label: "One-time" },
];

const BILLING_CYCLES: { value: ApiBillingCycle; label: string }[] = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Yearly", label: "Yearly" },
  { value: "OneTime", label: "One-time" },
];

const SUBSCRIPTION_BADGE: Record<ApiSubscription["status"], "success" | "warning" | "destructive" | "outline"> = {
  Active: "success",
  Paused: "warning",
  Cancelled: "destructive",
  Expired: "outline",
};

// Demo-mode sample rows so the screen reads correctly without a backend.
const DEMO_PLANS: ApiPackagePlan[] = [
  { id: "pp-1", name: "Phonics Foundations — Monthly", courseId: null, billingType: "Subscription", billingCycle: "Monthly", price: 2500, sessionsIncluded: 12, isActive: true },
  { id: "pp-2", name: "Maths Explorers — Quarterly", courseId: null, billingType: "Subscription", billingCycle: "Quarterly", price: 6900, sessionsIncluded: 36, isActive: true },
  { id: "pp-3", name: "Assessment Pack", courseId: null, billingType: "OneTime", billingCycle: "OneTime", price: 1200, sessionsIncluded: 1, isActive: false },
];

const DEMO_SUBSCRIPTIONS: ApiSubscription[] = [
  { id: "sub-1", parentProfileId: "p-1", childId: "c-1", childName: "Aarav Kapoor", packagePlanId: "pp-1", planName: "Phonics Foundations — Monthly", status: "Active", startDate: "2026-05-01", nextBillingAtUtc: "2026-08-01T00:00:00Z", cancelledAtUtc: null },
  { id: "sub-2", parentProfileId: "p-1", childId: "c-2", childName: "Diya Kapoor", packagePlanId: "pp-2", planName: "Maths Explorers — Quarterly", status: "Cancelled", startDate: "2026-02-15", nextBillingAtUtc: null, cancelledAtUtc: "2026-06-20T00:00:00Z" },
];

interface PlanForm {
  name: string;
  courseId: string;
  billingType: ApiBillingType;
  billingCycle: ApiBillingCycle;
  price: string;
  sessionsIncluded: string;
  isActive: boolean;
}

const EMPTY_PLAN_FORM: PlanForm = {
  name: "",
  courseId: "",
  billingType: "Subscription",
  billingCycle: "Monthly",
  price: "",
  sessionsIncluded: "",
  isActive: true,
};

export default function AdminPackages() {
  const live = apiEnabled();

  const { data: plans, loading: plansLoading, reload: reloadPlans } = useApiData<ApiPackagePlan[]>(() => listPackagePlans(), DEMO_PLANS);
  const { data: subscriptions, loading: subscriptionsLoading, reload: reloadSubscriptions } = useApiData<ApiSubscription[]>(
    () => listSubscriptions(),
    DEMO_SUBSCRIPTIONS
  );
  const { data: courseOptions } = useApiData<ApiCourseOption[]>(() => listCourseOptions(), []);
  const { data: students } = useApiData<StudentRow[]>(() => listStudents(), []);

  const courseNameById = useMemo(
    () => new Map(courseOptions.map((c) => [c.id, c.name] as const)),
    [courseOptions]
  );

  // ----- Plan create/edit dialog -----
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ApiPackagePlan | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN_FORM);
  const [planError, setPlanError] = useState<string | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN_FORM);
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  function openEditPlan(plan: ApiPackagePlan) {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      courseId: plan.courseId ?? "",
      billingType: plan.billingType,
      billingCycle: plan.billingCycle,
      price: String(plan.price),
      sessionsIncluded: plan.sessionsIncluded != null ? String(plan.sessionsIncluded) : "",
      isActive: plan.isActive,
    });
    setPlanError(null);
    setPlanDialogOpen(true);
  }

  async function savePlan() {
    const price = Number(planForm.price);
    if (!planForm.name.trim()) {
      setPlanError("Give the plan a name.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setPlanError("Enter a valid price.");
      return;
    }
    const sessions = planForm.sessionsIncluded.trim() === "" ? undefined : Number(planForm.sessionsIncluded);
    if (sessions !== undefined && (!Number.isInteger(sessions) || sessions < 1)) {
      setPlanError("Sessions included must be a whole number of at least 1.");
      return;
    }

    setSavingPlan(true);
    setPlanError(null);
    try {
      const input = {
        name: planForm.name.trim(),
        courseId: planForm.courseId || undefined,
        billingType: planForm.billingType,
        billingCycle: planForm.billingCycle,
        price,
        sessionsIncluded: sessions,
        isActive: planForm.isActive,
      };
      if (editingPlan) await updatePackagePlan(editingPlan.id, input);
      else await createPackagePlan(input);
      await reloadPlans();
      setPlanDialogOpen(false);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Couldn't save the plan.");
    } finally {
      setSavingPlan(false);
    }
  }

  // ----- Start-subscription dialog -----
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [subChildId, setSubChildId] = useState("");
  const [subPlanId, setSubPlanId] = useState("");
  const [subStartDate, setSubStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subError, setSubError] = useState<string | null>(null);
  const [savingSub, setSavingSub] = useState(false);

  function openStartSubscription() {
    setSubChildId("");
    setSubPlanId("");
    setSubStartDate(new Date().toISOString().slice(0, 10));
    setSubError(null);
    setSubDialogOpen(true);
  }

  async function startSubscription() {
    const child = students.find((s) => s.id === subChildId);
    if (!child) {
      setSubError("Pick a student.");
      return;
    }
    if (!subPlanId) {
      setSubError("Pick a plan.");
      return;
    }
    setSavingSub(true);
    setSubError(null);
    try {
      await createSubscription({
        parentProfileId: child.parentId,
        childId: child.id,
        packagePlanId: subPlanId,
        startDate: subStartDate,
      });
      await reloadSubscriptions();
      setSubDialogOpen(false);
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Couldn't start the subscription.");
    } finally {
      setSavingSub(false);
    }
  }

  // ----- Renew / cancel -----
  const [confirmCancel, setConfirmCancel] = useState<ApiSubscription | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRenew(sub: ApiSubscription) {
    if (!live) {
      setActionError("Demo mode — no subscription actually renewed.");
      return;
    }
    setActionError(null);
    setBusyId(sub.id);
    try {
      await renewSubscription(sub.id);
      await reloadSubscriptions();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't renew the subscription.");
    } finally {
      setBusyId(null);
    }
  }

  // Deliberately doesn't catch its own errors — the ConfirmDialog below returns this
  // promise directly, so a rejection surfaces as its inline error and keeps the dialog
  // open, instead of the dialog closing immediately regardless of outcome.
  async function handleCancel(sub: ApiSubscription) {
    if (!live) {
      setActionError("Demo mode — no subscription actually cancelled.");
      return;
    }
    await cancelSubscription(sub.id);
    await reloadSubscriptions();
  }

  const activePlans = plans.filter((p) => p.isActive);
  const activeSubscriptions = subscriptions.filter((s) => s.status === "Active");

  const planColumns: DataTableColumn<ApiPackagePlan>[] = useMemo(
    () => [
      {
        key: "name",
        header: "Plan",
        sortable: true,
        accessor: (p) => p.name,
        render: (p) => (
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.courseId ? courseNameById.get(p.courseId) ?? "Linked course" : "No course linked"}
            </p>
          </div>
        ),
      },
      {
        key: "billing",
        header: "Billing",
        sortable: true,
        accessor: (p) => p.billingCycle,
        render: (p) => (
          <Badge variant="outline">
            {p.billingType === "Subscription" ? `Recurring · ${p.billingCycle}` : p.billingType}
          </Badge>
        ),
      },
      {
        key: "price",
        header: "Price",
        sortable: true,
        accessor: (p) => p.price,
        render: (p) => <span className="font-semibold text-foreground">{formatCurrency(p.price)}</span>,
      },
      {
        key: "sessions",
        header: "Sessions",
        render: (p) => <span className="text-sm text-muted-foreground">{p.sessionsIncluded ?? "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (p) => (p.isActive ? "Active" : "Inactive"),
        render: (p) => <Badge variant={p.isActive ? "success" : "outline"}>{p.isActive ? "Active" : "Inactive"}</Badge>,
      },
      {
        key: "actions",
        header: "",
        render: (p) => (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditPlan(p); }}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ),
      },
    ],
    [courseNameById]
  );

  const subColumns: DataTableColumn<ApiSubscription>[] = useMemo(
    () => [
      {
        key: "child",
        header: "Student",
        sortable: true,
        accessor: (s) => s.childName,
        render: (s) => <span className="font-semibold text-foreground">{s.childName}</span>,
      },
      {
        key: "plan",
        header: "Plan",
        sortable: true,
        accessor: (s) => s.planName,
        render: (s) => <span className="text-sm text-muted-foreground">{s.planName}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (s) => s.status,
        render: (s) => <Badge variant={SUBSCRIPTION_BADGE[s.status]}>{s.status}</Badge>,
      },
      {
        key: "start",
        header: "Started",
        sortable: true,
        accessor: (s) => s.startDate,
        render: (s) => <span className="text-sm text-muted-foreground">{formatDate(s.startDate)}</span>,
      },
      {
        key: "nextBilling",
        header: "Next Invoice",
        sortable: true,
        accessor: (s) => s.nextBillingAtUtc ?? "",
        render: (s) => (
          <span className="text-sm text-muted-foreground">
            {s.nextBillingAtUtc ? formatDate(s.nextBillingAtUtc.slice(0, 10)) : "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (s) =>
          s.status === "Active" ? (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); setConfirmCancel(s); }}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={busyId === s.id}
              onClick={(e) => { e.stopPropagation(); void handleRenew(s); }}
            >
              {busyId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Renew
            </Button>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Packages & Subscriptions"
        description="The prices parents are billed: package plans set the amount and cycle; a subscription attaches a child to a plan and auto-generates their invoices."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Active Plans" value={String(activePlans.length)} icon={CreditCard} tone="primary" loading={plansLoading} />
        <KpiCard label="Active Subscriptions" value={String(activeSubscriptions.length)} icon={PlayCircle} tone="success" loading={subscriptionsLoading} />
        <KpiCard
          label="Next Auto-Invoice"
          value={
            activeSubscriptions
              .map((s) => s.nextBillingAtUtc)
              .filter((d): d is string => !!d)
              .sort()[0]
              ?.slice(0, 10) ?? "—"
          }
          icon={CalendarClock}
          tone="neutral"
          loading={subscriptionsLoading}
        />
      </div>

      {actionError && (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}

      <div className="mt-6">
        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Package Plans</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <DataTable
              data={plans}
              columns={planColumns}
              rowKey={(p) => p.id}
              searchPlaceholder="Search plans…"
              searchFn={(p, q) => p.name.toLowerCase().includes(q.toLowerCase())}
              onRowClick={openEditPlan}
              emptyTitle="No package plans yet"
              emptyDescription="Create a plan to define what parents are billed and how often."
              toolbar={
                <Button onClick={openCreatePlan}>
                  <PackagePlus className="h-4 w-4" />
                  New plan
                </Button>
              }
            />
          </TabsContent>

          <TabsContent value="subscriptions">
            <DataTable
              data={subscriptions}
              columns={subColumns}
              rowKey={(s) => s.id}
              searchPlaceholder="Search by student or plan…"
              searchFn={(s, q) => `${s.childName} ${s.planName}`.toLowerCase().includes(q.toLowerCase())}
              emptyTitle="No subscriptions yet"
              emptyDescription="Start a subscription to begin auto-billing a child on a plan."
              toolbar={
                <Button onClick={openStartSubscription}>
                  <PlayCircle className="h-4 w-4" />
                  Start subscription
                </Button>
              }
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / edit plan */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit plan" : "New package plan"}</DialogTitle>
            <DialogDescription>
              The plan's price is what each invoice bills; the cycle decides how often the auto-billing job issues one.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="plan-name">Plan name</Label>
              <Input
                id="plan-name"
                value={planForm.name}
                onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Phonics Foundations — Monthly"
              />
            </div>

            <div className="grid gap-1.5">
              <Label>Course (optional)</Label>
              <Select
                value={planForm.courseId || "none"}
                onValueChange={(v) => setPlanForm((f) => ({ ...f, courseId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No course linked" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No course linked</SelectItem>
                  {courseOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="plan-billing-type-select">Billing type</Label>
                <Select
                  value={planForm.billingType}
                  onValueChange={(v) => setPlanForm((f) => ({ ...f, billingType: v as ApiBillingType }))}
                >
                  <SelectTrigger id="plan-billing-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-billing-cycle-select">Billing cycle</Label>
                <Select
                  value={planForm.billingCycle}
                  onValueChange={(v) => setPlanForm((f) => ({ ...f, billingCycle: v as ApiBillingCycle }))}
                >
                  <SelectTrigger id="plan-billing-cycle-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CYCLES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="plan-price">Price (₹)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min="0"
                  value={planForm.price}
                  onChange={(e) => setPlanForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plan-sessions">Sessions included (optional)</Label>
                <Input
                  id="plan-sessions"
                  type="number"
                  min="1"
                  value={planForm.sessionsIncluded}
                  onChange={(e) => setPlanForm((f) => ({ ...f, sessionsIncluded: e.target.value }))}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={planForm.isActive}
                onCheckedChange={(v) => setPlanForm((f) => ({ ...f, isActive: v === true }))}
              />
              Plan is active (available for new subscriptions)
            </label>

            {planError && <p className="text-sm text-destructive">{planError}</p>}
            {!live && (
              <p className="text-xs text-muted-foreground">
                Demo mode — changes aren't saved without a backend configured.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void savePlan()} disabled={savingPlan || !live}>
              {savingPlan ? "Saving…" : editingPlan ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start subscription */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a subscription</DialogTitle>
            <DialogDescription>
              Attach a child to a plan. The first invoice is issued immediately (or on a future start date) and every
              cycle after, due 7 days from issue — it appears in the parent's Payments &amp; Billing right away.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="subscription-student-select">Student</Label>
              <Select value={subChildId} onValueChange={setSubChildId}>
                <SelectTrigger id="subscription-student-select">
                  <SelectValue placeholder="Pick a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                      {s.parentName ? ` — ${s.parentName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="subscription-plan-select">Plan</Label>
              <Select value={subPlanId} onValueChange={setSubPlanId}>
                <SelectTrigger id="subscription-plan-select">
                  <SelectValue placeholder="Pick a plan" />
                </SelectTrigger>
                <SelectContent>
                  {activePlans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(p.price)}
                      {p.billingType === "Subscription" ? ` / ${p.billingCycle.toLowerCase()}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="sub-start">Start date</Label>
              <Input
                id="sub-start"
                type="date"
                value={subStartDate}
                onChange={(e) => setSubStartDate(e.target.value)}
                className="w-44"
              />
            </div>

            {subError && <p className="text-sm text-destructive">{subError}</p>}
            {!live && (
              <p className="text-xs text-muted-foreground">
                Demo mode — changes aren't saved without a backend configured.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => void startSubscription()} disabled={savingSub || !live}>
              {savingSub ? "Starting…" : "Start subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
        title="Cancel this subscription?"
        description={
          confirmCancel
            ? `${confirmCancel.childName} will no longer be auto-billed for "${confirmCancel.planName}". Already-issued invoices stay as they are.`
            : ""
        }
        confirmLabel="Cancel subscription"
        destructive
        onConfirm={() => (confirmCancel ? handleCancel(confirmCancel) : undefined)}
      />
    </div>
  );
}
