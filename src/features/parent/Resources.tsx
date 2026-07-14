import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, Download, FileText, type LucideIcon, PlayCircle, Video } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { MultiChildSwitcher } from "@/components/MultiChildSwitcher";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/state/session";
import { getChildById } from "@/data/children";
import { getResourcesForBatch } from "@/data/resources";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import { downloadResource, toFrontendResource } from "@/api/resources";
import { getParentResources } from "@/api/parentPortal";
import { cn, formatDate } from "@/lib/utils";
import type { Resource } from "@/types";
import { findRecordingSession, recordingExpiryLabel } from "./utils";

type Tone = "primary" | "success" | "warning" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/20 text-warning-foreground",
  neutral: "bg-muted text-muted-foreground",
};

export default function ParentResources() {
  const { activeChildId, enrolledChildIds, children: sessionChildren } = useSession();
  const usingApi = apiEnabled();
  const mockChild = getChildById(activeChildId);
  const sessionChild = sessionChildren.find((c) => c.id === activeChildId) ?? sessionChildren[0];
  const child = usingApi
    ? sessionChild
      ? { id: sessionChild.id, name: sessionChild.name }
      : undefined
    : mockChild
      ? { id: mockChild.id, name: mockChild.name }
      : undefined;
  const isEnrolled = usingApi ? (sessionChild?.enrollmentComplete ?? false) : mockChild ? enrolledChildIds.includes(mockChild.id) : false;
  const [preview, setPreview] = useState<Resource | null>(null);

  // Admin-granted resources; the endpoint itself blocks access while fee-suspended
  const { data: apiResources } = useApiData<Resource[]>(
    () => getParentResources().then((items) => items.map(toFrontendResource)),
    []
  );
  const resources = useMemo(
    () =>
      usingApi
        ? apiResources
        : mockChild
          ? getResourcesForBatch(mockChild.batchId).filter((r) => r.visibleToParents)
          : [],
    [usingApi, apiResources, mockChild]
  );

  const books = resources.filter((r) => r.type === "book");
  const worksheets = resources.filter((r) => r.type === "worksheet");
  const recordings = resources.filter((r) => r.type === "recording");

  function handleDownload(resource: Resource) {
    if (apiEnabled()) {
      downloadResource(resource.id, resource.title);
      return;
    }
    const blob = new Blob(
      [`${resource.title}\n\nThis is a simulated worksheet download for The Reader Nest demo.\nUploaded on ${resource.uploadedOn}.`],
      { type: "text/plain" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resource.title.replace(/[^a-z0-9]+/gi, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Resources &amp; Recordings" description="Worksheets, reading books and 15-day recording access for your child." />
      <MultiChildSwitcher />

      {child && !isEnrolled && (
        <Card className="mt-4 border-warning/40 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-foreground" />
            <p className="text-sm text-foreground">
              Resources unlock once {child.name.split(" ")[0]}'s enrollment is complete.{" "}
              <Link to={`/parent/enrollment?childId=${child.id}`} className="font-semibold text-primary hover:underline">
                Finish enrollment →
              </Link>
            </p>
          </div>
        </Card>
      )}

      {!child ? (
        <EmptyState icon={BookOpen} title="No child selected" className="mt-6" />
      ) : (
        <Tabs defaultValue="books" className="mt-6">
          <TabsList>
            <TabsTrigger value="books">Reading Books ({books.length})</TabsTrigger>
            <TabsTrigger value="worksheets">Worksheets ({worksheets.length})</TabsTrigger>
            <TabsTrigger value="recordings">Recordings ({recordings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="books">
            {books.length === 0 ? (
              <EmptyState icon={BookOpen} title="No reading books yet" description="Your teacher hasn't shared any books for this batch." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {books.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    icon={BookOpen}
                    tone="primary"
                    action={
                      <Button size="sm" variant="soft" className="w-full" onClick={() => setPreview(r)}>
                        View
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="worksheets">
            {worksheets.length === 0 ? (
              <EmptyState icon={FileText} title="No worksheets yet" description="Worksheets shared by your teacher will appear here." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {worksheets.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    icon={FileText}
                    tone="success"
                    action={
                      <Button size="sm" className="w-full" onClick={() => handleDownload(r)}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recordings">
            {recordings.length === 0 ? (
              <EmptyState icon={Video} title="No recordings yet" description="Recordings stay available for 15 days after class." />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recordings.map((r) => {
                  const session = findRecordingSession(r);
                  const info = recordingExpiryLabel(session);
                  return (
                    <ResourceCard
                      key={r.id}
                      resource={r}
                      icon={Video}
                      tone={info.expired ? "neutral" : "warning"}
                      badge={info.label}
                      badgeVariant={info.expired ? "muted" : "warning"}
                      action={
                        <Button
                          size="sm"
                          variant={info.expired ? "outline" : "default"}
                          className="w-full"
                          disabled={info.expired}
                          onClick={() => setPreview(r)}
                        >
                          <PlayCircle className="h-3.5 w-3.5" /> {info.expired ? "Expired" : "Watch"}
                        </Button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>{preview.title}</DialogTitle>
                <DialogDescription>
                  {preview.type === "recording" ? "Session recording" : "Reading resource"} · Shared {formatDate(preview.uploadedOn, "long")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex aspect-video items-center justify-center rounded-xl bg-muted/60">
                {preview.type === "recording" ? (
                  <PlayCircle className="h-12 w-12 text-muted-foreground/60" />
                ) : (
                  <BookOpen className="h-12 w-12 text-muted-foreground/60" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This is a view-only preview in the demo — {preview.type === "recording" ? "recordings" : "reading books"} aren't
                downloadable, per policy.
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResourceCard({
  resource,
  icon: Icon,
  tone,
  action,
  badge,
  badgeVariant,
}: {
  resource: Resource;
  icon: LucideIcon;
  tone: Tone;
  action: ReactNode;
  badge?: string;
  badgeVariant?: "warning" | "muted";
}) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", TONE_CLASS[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        {badge && <Badge variant={badgeVariant === "warning" ? "warning" : "muted"}>{badge}</Badge>}
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{resource.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {resource.courseCategory} · {formatDate(resource.uploadedOn, "short")}
        {resource.sizeLabel ? ` · ${resource.sizeLabel}` : ""}
      </p>
      <div className="mt-4">{action}</div>
    </Card>
  );
}
