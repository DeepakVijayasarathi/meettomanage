import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarClock, Check, ClipboardList, Download, GraduationCap, Loader2, Printer, RotateCcw, Search, Table2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listDepartments, type ApiDepartment } from "@/api/departments";
import { listCourses, type ApiCourse } from "@/api/courses";
import { createQuizQuestion } from "@/api/quizQuestions";
import { getDesktop } from "./desktopBridge";

import { type RichLang } from "./desktopBridge";

// Logo orange first, then the logo navy (lightened so it stays visible on dark backgrounds), then supporting hues.
const PALETTE = ["#F97316", "#3B5B8F", "#FDBA74", "#0EA5E9", "#10B981", "#8B5CF6", "#EF4444", "#14B8A6"];

function Frame({ icon: Icon, title, subtitle, actions, children }: { icon: typeof Table2; title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="my-3 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{title}</p>
            {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 print:hidden">{actions}</div>
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

export function BlockError({ lang, raw }: { lang: string; raw: string }) {
  return (
    <div className="my-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-xs">
      <p className="font-medium text-destructive">Couldn't display this {lang} block.</p>
      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">{raw}</pre>
    </div>
  );
}

export function BlockPending({ lang }: { lang: string }) {
  const Icon = { chart: BarChart3, table: Table2, classplan: CalendarClock, quiz: ClipboardList }[lang as RichLang] ?? Table2;
  return (
    <div className="my-3 flex items-center gap-3 rounded-xl border border-dashed bg-muted/30 p-4">
      <Icon className="h-5 w-5 animate-pulse text-primary" />
      <div className="flex-1 space-y-1.5">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
      </div>
      <span className="text-xs text-muted-foreground">Building {lang === "classplan" ? "class plan" : lang}…</span>
    </div>
  );
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const asStr = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// ---------------- Chart ----------------
interface ChartSpec {
  type: "bar" | "line" | "area" | "pie";
  title?: string;
  xKey: string;
  series: { key: string; name: string }[];
  data: Record<string, unknown>[];
}

function parseChart(v: unknown): ChartSpec | null {
  if (!isObj(v)) return null;
  const data = asArr(v.data).filter(isObj);
  if (!data.length) return null;
  const xKey = asStr(v.xKey) || "name";
  let series = asArr(v.series).filter(isObj).map((s) => ({ key: asStr(s.key), name: asStr(s.name) || asStr(s.key) })).filter((s) => s.key);
  if (!series.length) {
    const numeric = Object.keys(data[0]).filter((k) => k !== xKey && typeof data[0][k] === "number");
    series = numeric.map((k) => ({ key: k, name: k }));
  }
  if (!series.length) return null;
  const type = (["bar", "line", "area", "pie"] as const).find((t) => t === v.type) ?? "bar";
  return { type, title: asStr(v.title) || undefined, xKey, series, data };
}

export function ChartBlock({ value }: { value: unknown }) {
  const spec = useMemo(() => parseChart(value), [value]);
  const [kind, setKind] = useState<ChartSpec["type"] | null>(null);
  if (!spec) return <BlockError lang="chart" raw={JSON.stringify(value)} />;
  const type = kind ?? spec.type;
  const common = { data: spec.data, margin: { top: 6, right: 12, left: -8, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" />
      <XAxis dataKey={spec.xKey} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
      <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
      {spec.series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
    </>
  );
  return (
    <Frame
      icon={BarChart3}
      title={spec.title ?? "Chart"}
      subtitle={`${spec.data.length} data points`}
      actions={(["bar", "line", "area", "pie"] as const).map((t) => (
        <button key={t} onClick={() => setKind(t)} className={cn("rounded px-1.5 py-0.5 text-[11px] capitalize", type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
          {t}
        </button>
      ))}
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === "pie" ? (
            <PieChart>
              <Pie data={spec.data} dataKey={spec.series[0].key} nameKey={spec.xKey} outerRadius="80%" label={{ fontSize: 11 }}>
                {spec.data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          ) : type === "line" ? (
            <LineChart {...common}>
              {axes}
              {spec.series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={{ r: 3 }} />)}
            </LineChart>
          ) : type === "area" ? (
            <AreaChart {...common}>
              {axes}
              {spec.series.map((s, i) => <Area key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.2} />)}
            </AreaChart>
          ) : (
            <BarChart {...common}>
              {axes}
              {spec.series.map((s, i) => <Bar key={s.key} dataKey={s.key} name={s.name} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} />)}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Frame>
  );
}

// ---------------- Table ----------------
const csvCell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function TableBlock({ value }: { value: unknown }) {
  const parsed = useMemo(() => {
    if (!isObj(value)) return null;
    const columns = asArr(value.columns).map(asStr);
    const rows = asArr(value.rows).map((r) => (Array.isArray(r) ? r.map(asStr) : isObj(r) ? columns.map((c) => asStr(r[c])) : [])).filter((r) => r.length);
    return columns.length ? { title: asStr(value.title) || "Table", columns, rows } : null;
  }, [value]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);

  const rows = useMemo(() => {
    if (!parsed) return [];
    let r = parsed.rows.filter((row) => !q || row.some((c) => c.toLowerCase().includes(q.toLowerCase())));
    if (sort) {
      r = [...r].sort((a, b) => {
        const x = a[sort.col] ?? "";
        const y = b[sort.col] ?? "";
        const nx = Number(x), ny = Number(y);
        return (x !== "" && y !== "" && !Number.isNaN(nx) && !Number.isNaN(ny) ? nx - ny : x.localeCompare(y)) * sort.dir;
      });
    }
    return r;
  }, [parsed, q, sort]);

  if (!parsed) return <BlockError lang="table" raw={JSON.stringify(value)} />;

  const exportCsv = () => {
    const csv = [parsed.columns, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = parsed.title.replace(/\W+/g, "-").toLowerCase() + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Frame
      icon={Table2}
      title={parsed.title}
      subtitle={`${rows.length}${rows.length !== parsed.rows.length ? ` of ${parsed.rows.length}` : ""} rows`}
      actions={
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-1.5 top-1.5 h-3 w-3 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" className="h-6 w-24 rounded border bg-background pl-5 pr-1 text-[11px] outline-none focus:w-36" />
          </div>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={exportCsv}><Download className="mr-1 h-3 w-3" /> CSV</Button>
        </>
      }
    >
      <div className="-m-3.5 max-h-80 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur">
            <tr>
              {parsed.columns.map((c, i) => (
                <th key={i} className="cursor-pointer select-none whitespace-nowrap px-3 py-2 font-semibold hover:text-primary" onClick={() => setSort((s) => (s?.col === i ? (s.dir === 1 ? { col: i, dir: -1 } : null) : { col: i, dir: 1 }))}>
                  {c} {sort?.col === i ? (sort.dir === 1 ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t even:bg-muted/20 hover:bg-primary/5">
                {parsed.columns.map((_, ci) => <td key={ci} className="px-3 py-1.5">{r[ci] ?? ""}</td>)}
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={parsed.columns.length} className="px-3 py-4 text-center text-muted-foreground">No matching rows</td></tr>}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

// ---------------- Class plan ----------------
export function ClassPlanBlock({ value }: { value: unknown }) {
  const plan = useMemo(() => {
    if (!isObj(value)) return null;
    const steps = asArr(value.steps).filter(isObj).map((s) => ({ time: asStr(s.time), title: asStr(s.title), activity: asStr(s.activity) }));
    if (!steps.length) return null;
    return {
      title: asStr(value.title) || "Class plan",
      meta: [asStr(value.subject), asStr(value.level), asStr(value.duration)].filter(Boolean),
      objectives: asArr(value.objectives).map(asStr),
      materials: asArr(value.materials).map(asStr),
      steps,
      homework: asStr(value.homework),
    };
  }, [value]);
  if (!plan) return <BlockError lang="classplan" raw={JSON.stringify(value)} />;

  return (
    <Frame
      icon={CalendarClock}
      title={plan.title}
      subtitle={plan.meta.join(" · ")}
      actions={<Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => window.print()}><Printer className="mr-1 h-3 w-3" /> Print</Button>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {plan.objectives.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Objectives</p>
            <ul className="space-y-1 text-sm">{plan.objectives.map((o, i) => <li key={i} className="flex gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />{o}</li>)}</ul>
          </div>
        )}
        {plan.materials.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Materials</p>
            <div className="flex flex-wrap gap-1.5">{plan.materials.map((m, i) => <span key={i} className="rounded-full border bg-muted/50 px-2 py-0.5 text-xs">{m}</span>)}</div>
          </div>
        )}
      </div>
      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Timeline</p>
      <ol className="relative space-y-3 border-l-2 border-primary/20 pl-4">
        {plan.steps.map((s, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
            <div className="flex flex-wrap items-baseline gap-2">
              {s.time && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">{s.time}</span>}
              <span className="text-sm font-semibold">{s.title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{s.activity}</p>
          </li>
        ))}
      </ol>
      {plan.homework && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <span className="font-semibold">Homework: </span>{plan.homework}
        </div>
      )}
    </Frame>
  );
}

// ---------------- Quiz ----------------
interface QuizQuestion { q: string; options: string[]; answer: number; explanation: string }

/** Pushes every question of a generated quiz into the live quiz-question bank (POST /api/quiz-questions). */
function PushQuizPanel({ questions, onDone }: { questions: QuizQuestion[]; onDone: () => void }) {
  const [departments, setDepartments] = useState<ApiDepartment[] | null>(null);
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [state, setState] = useState<{ phase: "idle" | "pushing" | "done"; sent: number; failed: string[] }>({ phase: "idle", sent: 0, failed: [] });
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([listDepartments(false), listCourses()])
      .then(([d, c]) => {
        if (!live) return;
        setDepartments(d);
        setCourses(c);
      })
      .catch((e: unknown) => live && setLoadError(e instanceof Error ? e.message : "Couldn't load departments"));
    return () => {
      live = false;
    };
  }, []);

  const courseChoices = courses.filter((c) => c.isActive && (!departmentId || c.departmentId === departmentId));
  // The API wants 2-6 options per question.
  const valid = questions.filter((q) => q.options.length >= 2 && q.options.length <= 6);
  const skipped = questions.length - valid.length;

  async function push() {
    if (!departmentId && !courseId) return;
    if (!window.confirm(`Add ${valid.length} question${valid.length === 1 ? "" : "s"} to the LIVE quiz bank?`)) return;
    setState({ phase: "pushing", sent: 0, failed: [] });
    const failed: string[] = [];
    let sent = 0;
    for (const q of valid) {
      try {
        await createQuizQuestion({
          ...(courseId ? { courseId } : { departmentId }),
          prompt: q.q,
          options: q.options.map((text, i) => ({ text, isCorrect: i === q.answer })),
        });
        sent++;
      } catch (e) {
        failed.push(`${q.q.slice(0, 40)}: ${e instanceof Error ? e.message : "failed"}`);
      }
      setState({ phase: "pushing", sent, failed: [...failed] });
    }
    setState({ phase: "done", sent, failed });
    if (sent > 0) onDone();
  }

  if (loadError) return <p className="text-xs text-destructive">{loadError}</p>;
  if (!departments) return <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading departments…</p>;

  return (
    <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 print:hidden">
      <p className="text-sm font-medium">Save to the live quiz bank</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={departmentId}
          onChange={(e) => { setDepartmentId(e.target.value); setCourseId(""); }}
          disabled={state.phase !== "idle"}
          className="h-8 rounded-md border bg-background px-2 text-sm"
          aria-label="Department"
        >
          <option value="">Department…</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} disabled={state.phase !== "idle" || !departmentId} className="h-8 rounded-md border bg-background px-2 text-sm" aria-label="Course (optional)">
          <option value="">All courses in department</option>
          {courseChoices.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {skipped > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">{skipped} question{skipped === 1 ? " has" : "s have"} fewer than 2 or more than 6 options and will be skipped.</p>}
      <div className="flex items-center gap-3">
        <Button size="sm" disabled={!departmentId || !valid.length || state.phase !== "idle"} onClick={() => void push()}>
          {state.phase === "pushing" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-1.5 h-4 w-4" />}
          {state.phase === "pushing" ? `Pushing ${state.sent}/${valid.length}…` : `Push ${valid.length} question${valid.length === 1 ? "" : "s"}`}
        </Button>
        {state.phase === "done" && (
          <span className={cn("text-xs", state.failed.length ? "text-destructive" : "text-emerald-600")}>
            {state.sent} saved{state.failed.length ? `, ${state.failed.length} failed` : ""}
          </span>
        )}
      </div>
      {state.failed.length > 0 && <ul className="list-disc pl-5 text-[11px] text-destructive">{state.failed.map((f, i) => <li key={i}>{f}</li>)}</ul>}
    </div>
  );
}

export function QuizBlock({ value }: { value: unknown }) {
  const quiz = useMemo(() => {
    if (!isObj(value)) return null;
    const questions = asArr(value.questions).filter(isObj).map((q) => ({
      q: asStr(q.q),
      options: asArr(q.options).map(asStr),
      answer: typeof q.answer === "number" ? q.answer : Number(q.answer),
      explanation: asStr(q.explanation),
    })).filter((q) => q.q && q.options.length > 1 && q.answer >= 0 && q.answer < q.options.length);
    return questions.length ? { title: asStr(value.title) || "Quiz", subject: asStr(value.subject), questions } : null;
  }, [value]);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushed, setPushed] = useState(false);
  if (!quiz) return <BlockError lang="quiz" raw={JSON.stringify(value)} />;

  const answered = Object.keys(picked).length;
  const score = quiz.questions.reduce((n, q, i) => n + (picked[i] === q.answer ? 1 : 0), 0);

  return (
    <Frame
      icon={GraduationCap}
      title={quiz.title}
      subtitle={`${quiz.subject ? quiz.subject + " · " : ""}${quiz.questions.length} questions`}
      actions={
        <>
          {checked && <span className="mr-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">{score}/{quiz.questions.length}</span>}
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => { setPicked({}); setChecked(false); }}><RotateCcw className="mr-1 h-3 w-3" /> Reset</Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => window.print()}><Printer className="mr-1 h-3 w-3" /> Print</Button>
          {!getDesktop()?.demo && (
            <Button variant={pushed ? "ghost" : "outline"} size="sm" className="h-6 px-1.5 text-[11px]" onClick={() => setPushOpen((v) => !v)}>
              {pushed ? <Check className="mr-1 h-3 w-3 text-emerald-600" /> : <UploadCloud className="mr-1 h-3 w-3" />} {pushed ? "Saved" : "Save to bank"}
            </Button>
          )}
        </>
      }
    >
      <ol className="space-y-5">
        {quiz.questions.map((q, qi) => (
          <li key={qi}>
            <p className="mb-2 text-sm font-medium"><span className="mr-1.5 text-muted-foreground">{qi + 1}.</span>{q.q}</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {q.options.map((o, oi) => {
                const sel = picked[qi] === oi;
                const right = checked && oi === q.answer;
                const wrong = checked && sel && oi !== q.answer;
                return (
                  <button
                    key={oi}
                    disabled={checked}
                    onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors",
                      right ? "border-emerald-500 bg-emerald-500/10" : wrong ? "border-destructive bg-destructive/10" : sel ? "border-primary bg-primary/10" : "hover:bg-muted/60",
                    )}
                  >
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold", sel && "border-primary bg-primary text-primary-foreground")}>{String.fromCharCode(65 + oi)}</span>
                    <span className="flex-1">{o}</span>
                    {right && <Check className="h-4 w-4 text-emerald-600" />}
                    {wrong && <X className="h-4 w-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {checked && q.explanation && <p className="mt-1.5 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{q.explanation}</p>}
          </li>
        ))}
      </ol>
      {pushOpen && <PushQuizPanel questions={quiz.questions} onDone={() => setPushed(true)} />}
      {!checked && (
        <Button className="mt-4" size="sm" disabled={answered < quiz.questions.length} onClick={() => setChecked(true)}>
          Check answers ({answered}/{quiz.questions.length})
        </Button>
      )}
    </Frame>
  );
}

export function RichBlock({ lang, raw }: { lang: RichLang; raw: string }) {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return <BlockError lang={lang} raw={raw} />;
  }
  if (lang === "chart") return <ChartBlock value={value} />;
  if (lang === "table") return <TableBlock value={value} />;
  if (lang === "classplan") return <ClassPlanBlock value={value} />;
  return <QuizBlock value={value} />;
}
