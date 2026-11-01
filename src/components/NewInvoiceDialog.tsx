import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useApiData } from "@/api/hooks";
import { listStudents } from "@/api/users";
import { listCourses } from "@/api/courses";
import { listDepartments } from "@/api/departments";
import { createInvoice } from "@/api/billing";
import { userMessage } from "@/lib/api";

const NO_COURSE = "none";

function inDays(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * One-off invoice for a student's family (exam fee, books, a missed month) — the API supported it but
 * there was no way to raise one from Billing, only through package subscriptions.
 */
export function NewInvoiceDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent>
        {/* Mounted only while open, so its lists load each time the dialog opens (and start fresh). */}
        {open && <NewInvoiceForm onDone={() => onOpenChange(false)} onCreated={onCreated} saving={saving} setSaving={setSaving} />}
      </DialogContent>
    </Dialog>
  );
}

function NewInvoiceForm({ onDone, onCreated, saving, setSaving }: { onDone: () => void; onCreated: () => void; saving: boolean; setSaving: (v: boolean) => void }) {
  const { toast } = useToast();
  const { data: students } = useApiData(() => listStudents(), []);
  const { data: courses } = useApiData(() => listCourses(), []);
  const { data: departments } = useApiData(() => listDepartments(false), []);
  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState(NO_COURSE);
  const [departmentId, setDepartmentId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => inDays(7));
  const [error, setError] = useState<string | null>(null);

  const student = students.find((s) => s.id === studentId);
  const activeCourses = useMemo(() => courses.filter((c) => c.isActive), [courses]);
  const effectiveDepartment = departmentId || departments[0]?.id || "";
  const amountValue = Number(amount);
  const valid = !!student?.parentId && !!effectiveDepartment && amountValue > 0 && !!dueDate;

  async function submit() {
    if (!student?.parentId) return;
    setSaving(true); setError(null);
    try {
      const created = await createInvoice({
        parentProfileId: student.parentId,
        childId: student.id,
        courseId: courseId === NO_COURSE ? null : courseId,
        departmentId: effectiveDepartment,
        amount: amountValue,
        dueDate,
      });
      toast({ variant: "success", title: "Invoice created", description: `${created.invoiceNumber} for ${student.name}'s family.` });
      onDone();
      onCreated();
    } catch (err) {
      setError(userMessage(err, "Could not create the invoice."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Bill a one-off amount, like an exam fee or books. Regular fees come from package subscriptions.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="inv-student">Student <span className="text-destructive">*</span></Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="inv-student"><SelectValue placeholder={students.length ? "Choose a student" : "No students yet"} /></SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}{s.parentName ? ` · ${s.parentName}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="inv-course">Course (optional)</Label>
              <Select value={courseId} onValueChange={(v) => { setCourseId(v); const c = activeCourses.find((x) => x.id === v); if (c) setDepartmentId(c.departmentId); }}>
                <SelectTrigger id="inv-course"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_COURSE}>No course</SelectItem>
                  {activeCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-department">Department <span className="text-destructive">*</span></Label>
              <Select value={effectiveDepartment} onValueChange={setDepartmentId}>
                <SelectTrigger id="inv-department"><SelectValue placeholder="Choose a department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-amount">Amount (₹) <span className="text-destructive">*</span></Label>
              <Input id="inv-amount" type="number" min={1} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inv-due">Due date <span className="text-destructive">*</span></Label>
              <Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onDone}>Cancel</Button>
          <Button disabled={!valid || saving} onClick={() => { void submit(); }}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create invoice
          </Button>
        </DialogFooter>
    </>
  );
}
