import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Mail, Send, Users2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CHILDREN } from "@/data/children";
import { BATCHES } from "@/data/batches";
import { CHART_PALETTE } from "@/lib/roles";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { listBatches } from "@/api/batches";
import { sendBulkEmail } from "@/api/reports";

type Scope = "all" | "batch";

const MOCK_BATCH_OPTIONS = BATCHES.map((b) => ({ id: b.id, name: b.name }));

export default function AdminBulkEmail() {
  const { data: batchOptions } = useApiData(
    () => listBatches().then((batches) => batches.map((b) => ({ id: b.id, name: b.name }))),
    MOCK_BATCH_OPTIONS
  );
  const [scope, setScope] = useState<Scope>("all");
  const [batchId, setBatchId] = useState(BATCHES[0].id);
  useEffect(() => {
    if (batchOptions.length > 0) setBatchId(batchOptions[0].id);
  }, [batchOptions]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  const activeStudents = useMemo(() => CHILDREN.filter((c) => c.enrollmentComplete), []);

  const recipientCount = useMemo(() => {
    if (sentCount !== null) return sentCount;
    if (scope === "all") return activeStudents.length;
    return CHILDREN.filter((c) => c.batchId === batchId).length;
  }, [scope, batchId, activeStudents, sentCount]);

  function handleSend() {
    if (apiEnabled()) {
      sendBulkEmail({ subject, body, batchId: scope === "batch" ? batchId : undefined }).then((result) => {
        setSentCount(result.recipientCount);
        setSent(true);
      });
      return;
    }
    setSent(true);
  }

  function handleComposeAnother() {
    setSent(false);
    setSubject("");
    setBody("");
  }

  if (sent) {
    return (
      <div>
        <PageHeader eyebrow="Communication" title="Bulk Email" description="Compose to all active students or a specific batch." />
        <Card className="mx-auto max-w-lg">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckCircle2 className="h-8 w-8" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-foreground">Email sent!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                &quot;{subject || "Untitled message"}&quot; was delivered to {recipientCount} recipient{recipientCount === 1 ? "" : "s"}.
              </p>
            </div>
            <Button onClick={handleComposeAnother}>
              <Mail className="h-4 w-4" />
              Compose Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader eyebrow="Communication" title="Bulk Email" description="Compose an announcement to all active students or a specific batch." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="grid gap-1.5">
              <Label>Recipient scope</Label>
              <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <TabsList>
                  <TabsTrigger value="all">All Active Students</TabsTrigger>
                  <TabsTrigger value="batch">Per Batch</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {scope === "batch" && (
              <div className="grid gap-1.5">
                <Label>Batch</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {batchOptions.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="email-subject">Subject</Label>
              <Input id="email-subject" placeholder="e.g. Upcoming holiday schedule" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="email-body">Message</Label>
              <Textarea
                id="email-body"
                placeholder="Write your announcement here…"
                className="min-h-[220px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                This will be delivered to <span className="font-semibold text-foreground">{recipientCount}</span> recipient
                {recipientCount === 1 ? "" : "s"}.
              </p>
              <Button disabled={!subject.trim() || !body.trim()} onClick={handleSend}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${CHART_PALETTE[4]}1A`, color: CHART_PALETTE[4] }}>
                <Users2 className="h-[18px] w-[18px]" />
              </span>
              <p className="text-sm font-semibold text-foreground">Recipient Preview</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{recipientCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {scope === "all" ? "active students across all batches" : "students in the selected batch"}
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>• Delivery is simulated — no real emails are sent.</li>
              <li>• Recipients are derived live from enrollment and batch data.</li>
              <li>• Use &quot;Per Batch&quot; scope to target a single class roster.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
