import { useEffect, useState } from "react";
import { BadgePercent, Percent, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getSettings, toSettingsMap, updateSettings } from "@/api/settings";
import {
  createDiscountCode, describeDiscount, listDiscountCodes, SIBLING_DISCOUNT_SETTING, updateDiscountCode,
  type ApiDiscountCode, type SaveDiscountCode,
} from "@/api/discounts";

interface Form {
  id: string | null;
  code: string;
  description: string;
  kind: "percent" | "amount";
  value: string;
  validUntil: string;
  maxRedemptions: string;
  oncePerFamily: boolean;
  isActive: boolean;
}

const empty: Form = { id: null, code: "", description: "", kind: "percent", value: "10", validUntil: "", maxRedemptions: "", oncePerFamily: true, isActive: true };

/** Admin Finance: promo codes, and the automatic sibling discount on recurring invoices. */
export default function Discounts() {
  const { toast } = useToast();
  const codes = useApiData(() => listDiscountCodes(), []);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [sibling, setSibling] = useState("");
  const [siblingSaved, setSiblingSaved] = useState("");

  useEffect(() => {
    if (!apiEnabled()) return;
    getSettings().then((s) => {
      const value = toSettingsMap(s)[SIBLING_DISCOUNT_SETTING] ?? "";
      setSibling(value);
      setSiblingSaved(value);
    }).catch(() => undefined);
  }, []);

  const active = codes.data.filter((c) => c.isActive);
  const totalSaved = codes.data.reduce((sum, c) => sum + c.totalDiscounted, 0);

  const save = async () => {
    if (!form) return;
    const value = Number(form.value);
    if (!form.code.trim() || !(value > 0)) {
      toast({ variant: "error", title: "Enter a code and a discount above zero" });
      return;
    }
    const body: SaveDiscountCode = {
      code: form.code.trim(),
      description: form.description.trim() || null,
      percentOff: form.kind === "percent" ? value : null,
      amountOff: form.kind === "amount" ? value : null,
      validUntilUtc: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : null,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      oncePerFamily: form.oncePerFamily,
      isActive: form.isActive,
    };
    setBusy(true);
    try {
      if (form.id) await updateDiscountCode(form.id, body);
      else await createDiscountCode(body);
      toast({ variant: "success", title: form.id ? "Code updated" : `Code ${body.code.toUpperCase()} created` });
      setForm(null);
      codes.reload();
    } catch (e) {
      toast({ variant: "error", title: "Couldn't save", description: userMessage(e, "Please try again.") });
    } finally {
      setBusy(false);
    }
  };

  const saveSibling = async () => {
    const value = sibling.trim();
    if (value && !(Number(value) >= 0 && Number(value) <= 100)) {
      toast({ variant: "error", title: "Enter a percentage between 0 and 100" });
      return;
    }
    try {
      await updateSettings([{ key: SIBLING_DISCOUNT_SETTING, value: value || null, category: "General" }]);
      setSiblingSaved(value);
      toast({ variant: "success", title: Number(value) > 0 ? `Sibling discount set to ${value}%` : "Sibling discount turned off" });
    } catch (e) {
      toast({ variant: "error", title: "Couldn't save", description: userMessage(e, "Please try again.") });
    }
  };

  const edit = (c: ApiDiscountCode) => setForm({
    id: c.id, code: c.code, description: c.description ?? "", kind: c.percentOff != null ? "percent" : "amount",
    value: String(c.percentOff ?? c.amountOff ?? ""), validUntil: c.validUntilUtc?.slice(0, 10) ?? "",
    maxRedemptions: c.maxRedemptions ? String(c.maxRedemptions) : "", oncePerFamily: c.oncePerFamily, isActive: c.isActive,
  });

  const columns: DataTableColumn<ApiDiscountCode>[] = [
    { key: "code", header: "Code", sortable: true, accessor: (c) => c.code, render: (c) => <div><p className="font-mono font-semibold">{c.code}</p>{c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}</div> },
    { key: "value", header: "Discount", render: (c) => <span className="text-sm">{describeDiscount(c)}</span> },
    { key: "uses", header: "Used", sortable: true, accessor: (c) => c.redemptionCount, render: (c) => <span className="tabular text-sm">{c.redemptionCount}{c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}</span> },
    { key: "saved", header: "Discounted", sortable: true, accessor: (c) => c.totalDiscounted, render: (c) => <span className="tabular text-sm">{formatCurrency(c.totalDiscounted)}</span> },
    { key: "until", header: "Valid until", render: (c) => <span className="text-sm text-muted-foreground">{c.validUntilUtc ? formatDate(c.validUntilUtc) : "No end date"}</span> },
    { key: "status", header: "Status", render: (c) => <Badge variant={c.isActive ? "secondary" : "outline"}>{c.isActive ? "Active" : "Off"}</Badge> },
    { key: "edit", header: "", render: (c) => <Button size="sm" variant="ghost" onClick={() => edit(c)}>Edit</Button> },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Discounts"
        description="Promo codes families can enter before paying, and an automatic discount for siblings."
        actions={<Button onClick={() => setForm({ ...empty })}><Plus className="mr-1.5 h-4 w-4" />New code</Button>}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Active codes" value={String(active.length)} icon={BadgePercent} tone="primary" />
        <KpiCard label="Total discounted" value={formatCurrency(totalSaved)} detail="through promo codes" icon={Percent} tone="neutral" />
        <KpiCard label="Sibling discount" value={Number(siblingSaved) > 0 ? `${siblingSaved}%` : "Off"} detail="on recurring invoices" icon={Users} tone={Number(siblingSaved) > 0 ? "success" : "neutral"} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Sibling discount</CardTitle>
          <CardDescription>Taken off each new recurring invoice for a family&apos;s second and later child with an active subscription. Manually created invoices are never changed.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="sibling">Percentage off</Label>
            <Input id="sibling" className="w-32" type="number" min={0} max={100} placeholder="e.g. 10" value={sibling} onChange={(e) => setSibling(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => void saveSibling()} disabled={!apiEnabled() || sibling === siblingSaved}>Save</Button>
        </CardContent>
      </Card>

      <DataTable
        data={codes.data}
        columns={columns}
        rowKey={(c) => c.id}
        searchPlaceholder="Search codes…"
        searchFn={(c, q) => [c.code, c.description].some((v) => v?.toLowerCase().includes(q.toLowerCase()))}
        emptyTitle="No promo codes yet"
        emptyDescription="Create a code such as SUMMER10 and share it with families."
        error={apiEnabled() ? codes.error : null}
        onRetry={codes.reload}
      />

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-md">
          {form && (
            <>
              <DialogHeader>
                <DialogTitle>{form.id ? `Edit ${form.code}` : "New promo code"}</DialogTitle>
                <DialogDescription>Families enter this code on their billing page before they pay.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="dc-code">Code</Label>
                  <Input id="dc-code" className="font-mono uppercase" maxLength={32} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() })} placeholder="SUMMER10" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="dc-desc">Description (optional)</Label>
                  <Input id="dc-desc" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Type</Label>
                    <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as Form["kind"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percent">Percentage</SelectItem><SelectItem value="amount">Fixed amount (₹)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="dc-value">{form.kind === "percent" ? "Percent off" : "Amount off"}</Label>
                    <Input id="dc-value" type="number" min={0.01} max={form.kind === "percent" ? 100 : undefined} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="dc-until">Valid until (optional)</Label>
                    <Input id="dc-until" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="dc-max">Total uses (optional)</Label>
                    <Input id="dc-max" type="number" min={1} value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} />
                  </div>
                </div>
                <label className="flex items-center justify-between rounded-md border p-3 text-sm"><span>Once per family</span><Switch checked={form.oncePerFamily} onCheckedChange={(v) => setForm({ ...form, oncePerFamily: v })} /></label>
                <label className="flex items-center justify-between rounded-md border p-3 text-sm"><span>Active</span><Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /></label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
                <Button onClick={() => void save()} disabled={busy}>{form.id ? "Save" : "Create code"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
