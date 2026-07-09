import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, PartyPopper, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COURSES } from "@/data/courses";

export default function ParentAddChild() {
  const [form, setForm] = useState({ name: "", age: "", grade: "", gender: "", courseInterest: "" });
  const [submitted, setSubmitted] = useState(false);

  const courseOptions = COURSES.filter((c) => c.type !== "demo" && c.status === "active");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    const displayName = form.name.trim() || "Your child";
    return (
      <div>
        <PageHeader title="Add Child" description="Enroll a sibling under your account." />
        <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/15 text-success">
            <PartyPopper className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold text-foreground">{displayName} has been added!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome to The Reader Nest family. To get {form.name.trim() ? form.name.trim() : "them"} started, we just need a quick
            enrollment form — grade, contact details and course interest.
          </p>
          <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Demo note: this preview reuses our sample learner <span className="font-semibold text-foreground">Kabir Kapoor</span> to walk
            through the enrollment flow end-to-end.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/parent/enrollment?childId=c-3">
                Complete Enrollment <CheckCircle2 className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/parent">Back to Dashboard</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Add Child" description="Add a sibling to your account — you'll complete their enrollment right after." />
      <Card className="mx-auto mt-6 max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Child details
          </CardTitle>
          <CardDescription>We'll use this to set up their profile and suggest the right course.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Child's full name</Label>
                <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Anaya Kapoor" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={2}
                  max={18}
                  required
                  value={form.age}
                  onChange={(e) => update("age", e.target.value)}
                  placeholder="e.g. 6"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="grade">Grade</Label>
                <Input id="grade" required value={form.grade} onChange={(e) => update("grade", e.target.value)} placeholder="e.g. Grade 1" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course">Course interest</Label>
              <Select value={form.courseInterest} onValueChange={(v) => update("courseInterest", v)}>
                <SelectTrigger id="course">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="mt-2">
              <CheckCircle2 className="h-4 w-4" /> Add child
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
