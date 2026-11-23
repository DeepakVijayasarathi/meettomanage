import { useMemo, useState } from "react";
import { ChevronDown, Clock3, Loader2, Plus, Send, Star, Trash2, UserPlus, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InlineAlert } from "@/components/InlineAlert";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { KpiCard } from "@/components/KpiCard";
import { apiEnabled, userMessage } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  listAdminReviews,
  createReview,
  updateReview,
  deleteReview,
  listReviewRequests,
  createReviewRequest,
  sendReviewRequest,
  updateReviewRequestStatus,
  type Review,
  type ReviewRequest,
  type ReviewStatus,
  type ReviewSource,
  type ReviewPlatform,
} from "@/api/reviews";
import { formatDate } from "@/lib/utils";

/** Cast FormDataEntryValue (string | File | null) to plain Record<string, string | number | boolean | null>. */
function castEntryMap(fd: FormData): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, val] of fd.entries()) {
    out[key] = typeof val === "string" ? (val === "true" ? true : val === "false" ? false : val) : null;
  }
  return out;
}

// ===== Reviews Tab =====

const SOURCE_LABEL: Record<ReviewSource, string> = {
  internal: "Internal",
  capterra: "Capterra",
  g2: "G2",
  google: "Google",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
};

const SOURCE_COLORS: Record<ReviewSource, string> = {
  internal: "default",
  capterra: "secondary",
  g2: "secondary",
  google: "outline",
  linkedin: "default",
  whatsapp: "default",
};

const STARS = (rating: number) =>
  Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`h-4 w-4 ${i < rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
    />
  ));

const emptyReviews: Review[] = [];

export default function AdminReviews() {
  const { toast } = useToast();
  const live = apiEnabled();
  const [activeTab, setActiveTab] = useState<"reviews" | "requests">("reviews");

  // Reviews state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Review | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Review Requests state
  const [reqAddOpen, setReqAddOpen] = useState(false);
  const [reqBusyId, setReqBusyId] = useState<string | null>(null);

  // ===== Reviews CRUD =====

  const { data: reviewsData, error: reviewsError, reload: reloadReviews } = useApiData(
    () => listAdminReviews(),
    { items: emptyReviews, totalCount: 0 },
    { items: emptyReviews, totalCount: 0 }
  );
  const reviews = reviewsData?.items ?? [];

  const reviewColumns: DataTableColumn<Review>[] = useMemo(
    () => [
      {
        key: "rating",
        header: "Rating",
        render: (row) => <div className="flex">{STARS(row.rating)}</div>,
      },
      {
        key: "author",
        header: "Author",
        accessor: (row) => row.authorName,
        render: (row) => (
          <div>
            <p className="font-medium text-sm">{row.authorName}</p>
            {row.authorRole && <p className="text-xs text-muted-foreground">{row.authorRole}</p>}
          </div>
        ),
      },
      {
        key: "source",
        header: "Source",
        accessor: (row) => row.source,
        render: (row) => (
          <Badge variant={SOURCE_COLORS[row.source] as any}>{SOURCE_LABEL[row.source]}</Badge>
        ),
      },
      {
        key: "text",
        header: "Review",
        accessor: (row) => row.text,
        render: (row) => (
          <p className="text-sm max-w-xs truncate" title={row.text}>
            {row.text}
          </p>
        ),
      },
      {
        key: "visible",
        header: "Visible",
        accessor: (row) => row.isVisible ? "Yes" : "No",
        render: (row) => (
          <Badge variant={row.isVisible ? "success" : "outline"}>
            {row.isVisible ? "Visible" : "Hidden"}
          </Badge>
        ),
      },
      {
        key: "created",
        header: "Created",
        accessor: (row) => row.createdAtUtc,
        render: (row) => (
          <span className="text-xs text-muted-foreground">{formatDate(row.createdAtUtc.slice(0, 10))}</span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEditReview(row); setEditOpen(true); }}
              disabled={busyId === row.id}
              title="Edit"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteConfirm(row)}
              disabled={busyId === row.id}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ===== Review Requests CRUD =====

  const { data: reqsData, error: reqsError, reload: reloadRequests } = useApiData(
    () => listReviewRequests(),
    { items: [], count: 0 },
    { items: [], count: 0 }
  );
  const requests = reqsData?.items ?? [];

  const REQUEST_STATUS_ORDER: ReviewStatus[] = ["pending", "sent", "replied", "declined", "expired"];
  const REQUEST_STATUS_COLORS: Record<ReviewStatus, string> = {
    pending: "warning",
    sent: "default",
    replied: "success",
    declined: "destructive",
    expired: "outline",
  };

  const requestColumns: DataTableColumn<ReviewRequest>[] = useMemo(
    () => [
      {
        key: "contact",
        header: "Contact",
        accessor: (row) => row.contactName,
        render: (row) => (
          <div>
            <p className="font-medium text-sm">{row.contactName}</p>
            <p className="text-xs text-muted-foreground">
              {row.contactMethod === "email" ? "📧" : "💬"} {row.contactValue}
            </p>
          </div>
        ),
      },
      {
        key: "platform",
        header: "Platform",
        accessor: (row) => row.platform,
        render: (row) => (
          <Badge variant="secondary">{row.platform}</Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        accessor: (row) => row.status,
        render: (row) => (
          <Badge variant={REQUEST_STATUS_COLORS[row.status] as any}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        ),
      },
      {
        key: "created",
        header: "Created",
        accessor: (row) => row.createdAtUtc,
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatDate(row.createdAtUtc.slice(0, 10))}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {row.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!live) return;
                  setReqBusyId(row.id);
                  try {
                    await sendReviewRequest(row.id);
                    await reloadRequests();
                    toast({ variant: "success", title: "Review request sent", description: `Email/WhatsApp sent to ${row.contactName}.` });
                  } catch (err) {
                    toast({ variant: "error", title: "Failed to send", description: userMessage(err, "Couldn't send request.") });
                  } finally {
                    setReqBusyId(null);
                  }
                }}
                disabled={reqBusyId === row.id}
              >
                {reqBusyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            )}
            {row.status === "pending" && (
              <Select
                onValueChange={async (val: ReviewStatus) => {
                  if (!live) return;
                  try {
                    await updateReviewRequestStatus(row.id, val);
                    await reloadRequests();
                    toast({ variant: "success", title: "Status updated", description: `Marked as ${val}.` });
                  } catch (err) {
                    toast({ variant: "error", title: "Failed", description: userMessage(err) });
                  }
                }}
              >
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_STATUS_ORDER.filter(s => s !== row.status).map((s) => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live]
  );

  // ===== Handlers =====

  async function handleCreateReview(input: Record<string, string | number | boolean | null>) {
    setBusyId("new");
    try {
      await createReview({
        source: input.source as ReviewSource,
        rating: Number(input.rating),
        authorName: input.authorName as string,
        authorRole: input.authorRole as string | undefined,
        text: input.text as string,
        response: input.response as string | undefined,
        reviewUrl: input.reviewUrl as string | undefined,
        isVisible: input.isVisible === "true",
      });
      setAddOpen(false);
      await reloadReviews();
      toast({ variant: "success", title: "Review added", description: `${input.authorName} has been added.` });
    } catch (err) {
      toast({ variant: "error", title: "Failed to add review", description: userMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateReview(id: string, input: Record<string, string | number | boolean | null>) {
    setBusyId(id);
    try {
      await updateReview(id, {
        rating: Number(input.rating) || undefined,
        authorName: input.authorName as string || undefined,
        authorRole: input.authorRole as string | undefined,
        text: input.text as string || undefined,
        response: input.response as string | undefined,
        reviewUrl: input.reviewUrl as string | undefined,
        isVisible: input.isVisible === "true" ? true : undefined,
      });
      setEditOpen(false);
      setEditReview(null);
      await reloadReviews();
      toast({ variant: "success", title: "Review updated" });
    } catch (err) {
      toast({ variant: "error", title: "Failed to update", description: userMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteReview(id: string) {
    setBusyId(id);
    try {
      await deleteReview(id);
      setDeleteConfirm(null);
      await reloadReviews();
      toast({ variant: "success", title: "Review deleted" });
    } catch (err) {
      toast({ variant: "error", title: "Failed to delete", description: userMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateRequest(input: Record<string, string | null>) {
    try {
      await createReviewRequest({
        contactName: input.contactName!,
        contactMethod: input.contactMethod!,
        contactValue: input.contactValue!,
        platform: input.platform as ReviewPlatform,
      });
      setReqAddOpen(false);
      await reloadRequests();
      toast({ variant: "success", title: "Request created", description: `Will be sent to ${input.contactName}.` });
    } catch (err) {
      toast({ variant: "error", title: "Failed to create request", description: userMessage(err) });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews & Reviews Requests"
        description="Manage public reviews and send review requests to customers."
      />

      {reviewsError && (
        <InlineAlert variant="error">Failed to load reviews: {userMessage(reviewsError)}</InlineAlert>
      )}
      {reqsError && (
        <InlineAlert variant="error">Failed to load review requests: {userMessage(reqsError)}</InlineAlert>
      )}

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Reviews" value={reviews.length.toString()} />
        <KpiCard label="Visible Reviews" value={reviews.filter(r => r.isVisible).length.toString()} />
        <KpiCard label="Pending Requests" value={requests.filter(r => r.status === "pending").length.toString()} />
        <KpiCard label="Sent Requests" value={requests.filter(r => r.status === "sent").length.toString()} />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "reviews" | "requests")}>
        <TabsList>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="requests">Review Requests ({requests.length})</TabsTrigger>
        </TabsList>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Review
            </Button>
          </div>

          <DataTable rowKey={(row) => row.id} columns={reviewColumns} data={reviews} />

          {reviews.length === 0 && !reviewsError && (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              description="Add your first review or wait for customer reviews to appear."
            />
          )}
        </TabsContent>

        {/* Review Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setReqAddOpen(true)}>
              <UserPlus className="h-4 w-4" /> Create Request
            </Button>
          </div>

          <DataTable rowKey={(row) => row.id} columns={requestColumns} data={requests} />

          {requests.length === 0 && !reqsError && (
            <EmptyState
              icon={Clock3}
              title="No review requests yet"
              description="Create a review request to invite customers to share their experience."
            />
          )}
        </TabsContent>
      </Tabs>

      {/* ===== Add Review Dialog ===== */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Review</DialogTitle>
            <DialogDescription>Add a new review for the marketing site.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleCreateReview(castEntryMap(fd));
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select name="source" defaultValue="internal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(SOURCE_LABEL).map((s) => (
                        <SelectItem key={s} value={s}>{SOURCE_LABEL[s as ReviewSource]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating</Label>
                  <Select name="rating" defaultValue="5">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={n.toString()}>{n} Star{n > 1 ? "s" : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorName">Author Name</Label>
                <Input id="authorName" name="authorName" required placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authorRole">Role / Company</Label>
                <Input id="authorRole" name="authorRole" placeholder="Head Teacher, ABC Academy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text">Review Text</Label>
                <Textarea id="text" name="text" required rows={3} placeholder="The review text..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="response">Our Response</Label>
                <Textarea id="response" name="response" rows={2} placeholder="Thank you for your feedback!" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reviewUrl">Review URL</Label>
                <Input id="reviewUrl" name="reviewUrl" placeholder="https://capterra.com/..." />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="isVisible" id="isVisible" defaultChecked className="rounded" />
                <Label htmlFor="isVisible" className="font-normal">Visible on public pages</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busyId === "new"}>
                {busyId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Edit Review Dialog ===== */}
      <Dialog open={editOpen} onOpenChange={(open) => { if (!open) setEditReview(null); setEditOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
            <DialogDescription>Edit the review details.</DialogDescription>
          </DialogHeader>
          {editReview && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                handleUpdateReview(editReview.id, castEntryMap(fd));
              }}
            >
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select name="source" defaultValue={editReview.source}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(SOURCE_LABEL).map((s) => (
                          <SelectItem key={s} value={s}>{SOURCE_LABEL[s as ReviewSource]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-rating">Rating</Label>
                    <Select name="rating" defaultValue={editReview.rating.toString()}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-authorName">Author Name</Label>
                  <Input id="edit-authorName" name="authorName" defaultValue={editReview.authorName} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-authorRole">Role / Company</Label>
                  <Input id="edit-authorRole" name="authorRole" defaultValue={editReview.authorRole || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-text">Review Text</Label>
                  <Textarea id="edit-text" name="text" defaultValue={editReview.text} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-response">Response</Label>
                  <Textarea id="edit-response" name="response" defaultValue={editReview.response || ""} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-reviewUrl">Review URL</Label>
                  <Input id="edit-reviewUrl" name="reviewUrl" defaultValue={editReview.reviewUrl || ""} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" name="isVisible" id="edit-isVisible" defaultChecked={editReview.isVisible} className="rounded" />
                  <Label htmlFor="edit-isVisible" className="font-normal">Visible on public pages</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={busyId === editReview.id}>
                  {busyId === editReview.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Delete Confirm ===== */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
        title="Delete Review"
        description={`Are you sure you want to delete the review from ${deleteConfirm?.authorName}? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleteConfirm?.id) {
            await handleDeleteReview(deleteConfirm.id);
          }
        }}
      />

      {/* ===== Create Review Request Dialog ===== */}
      <Dialog open={reqAddOpen} onOpenChange={setReqAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Review Request</DialogTitle>
            <DialogDescription>Invite a customer to leave a review on a platform.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              handleCreateRequest(Object.fromEntries(fd) as Record<string, string>);
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="req-contactName">Contact Name</Label>
                <Input id="req-contactName" name="contactName" required placeholder="Rajesh Kumar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="req-contactMethod">Contact Method</Label>
                  <Select name="contactMethod" defaultValue="email">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="req-platform">Platform</Label>
                  <Select name="platform" defaultValue="google">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="capterra">Capterra</SelectItem>
                      <SelectItem value="g2">G2</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="req-contactValue">Email or Phone</Label>
                <Input id="req-contactValue" name="contactValue" required placeholder="rajesh@example.com" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                <UserPlus className="h-4 w-4" /> Create Request
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
