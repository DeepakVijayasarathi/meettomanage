import { useMemo, useState } from "react";
import { Loader2, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { InlineAlert } from "@/components/InlineAlert";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiEnabled } from "@/lib/api";
import { useApiData } from "@/api/hooks";
import {
  createBlogPost,
  deleteBlogPost,
  listBlogPostsAdmin,
  updateBlogPost,
  type ApiBlogPost,
} from "@/api/marketing";
import { formatDate } from "@/lib/utils";

const DEMO_POSTS: ApiBlogPost[] = [
  {
    id: "bp-1",
    title: "5 signs your academy has outgrown spreadsheets",
    slug: "signs-academy-outgrown-spreadsheets",
    excerpt: "Spreadsheets and a WhatsApp group get a small academy through its first year. Here's how to tell you've outgrown them.",
    content: "Every academy starts the same way...",
    readMinutes: 5,
    isPublished: true,
    publishedAtUtc: "2026-07-14T00:00:00Z",
    createdAtUtc: "2026-07-14T00:00:00Z",
  },
];

const EMPTY_FORM = { title: "", slug: "", excerpt: "", content: "", isPublished: false };

export default function BlogPosts() {
  const { toast } = useToast();
  const live = apiEnabled();
  const { data: posts, error, reload } = useApiData<ApiBlogPost[]>(() => listBlogPostsAdmin(), DEMO_POSTS);

  const [editing, setEditing] = useState<ApiBlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiBlogPost | null>(null);

  const open = creating || editing !== null;

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreating(true);
  }

  function openEdit(post: ApiBlogPost) {
    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, isPublished: post.isPublished });
    setFormError(null);
    setEditing(post);
  }

  function closeDialog() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      setFormError("Title, excerpt and content are all required.");
      return;
    }

    if (!live) {
      toast({ variant: "success", title: "Demo mode", description: "No post was actually saved." });
      closeDialog();
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateBlogPost(editing.id, {
          title: form.title,
          slug: form.slug || editing.slug,
          excerpt: form.excerpt,
          content: form.content,
          isPublished: form.isPublished,
        });
        toast({ variant: "success", title: "Post updated" });
      } else {
        await createBlogPost({
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt,
          content: form.content,
          isPublished: form.isPublished,
        });
        toast({ variant: "success", title: "Post created" });
      }
      await reload();
      closeDialog();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save this post.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!live) {
      toast({ variant: "success", title: "Demo mode", description: "No post was actually deleted." });
      return;
    }
    await deleteBlogPost(deleteTarget.id);
    await reload();
    toast({ variant: "success", title: "Post deleted" });
  }

  const columns: DataTableColumn<ApiBlogPost>[] = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        sortable: true,
        accessor: (row) => row.title,
        render: (row) => (
          <div>
            <p className="font-semibold text-foreground">{row.title}</p>
            <p className="text-xs text-muted-foreground">/blog/{row.slug}</p>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        accessor: (row) => (row.isPublished ? "Published" : "Draft"),
        render: (row) => <Badge variant={row.isPublished ? "success" : "muted"}>{row.isPublished ? "Published" : "Draft"}</Badge>,
      },
      {
        key: "published",
        header: "Published",
        sortable: true,
        accessor: (row) => row.publishedAtUtc ?? "",
        render: (row) => <span className="text-sm text-muted-foreground">{row.publishedAtUtc ? formatDate(row.publishedAtUtc.slice(0, 10)) : "—"}</span>,
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button size="iconSm" variant="outline" onClick={() => openEdit(row)} aria-label={`Edit ${row.title}`}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="iconSm" variant="outline" onClick={() => setDeleteTarget(row)} aria-label={`Delete ${row.title}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        eyebrow="Marketing"
        title="Blog Posts"
        description="The public marketing blog (/blog). Content is plain text: a blank line starts a new paragraph, and a line starting with '## ' becomes a heading."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Post
          </Button>
        }
      />

      {live && error && (
        <InlineAlert variant="warning" className="mb-4">
          Could not load blog posts ({error}).{" "}
          <button type="button" className="underline" onClick={() => reload()}>
            Retry
          </button>
        </InlineAlert>
      )}

      {posts.length === 0 && !error ? (
        <EmptyState icon={Newspaper} title="No blog posts yet" description="Create your first post to publish it to /blog." />
      ) : (
        <DataTable
          data={posts}
          columns={columns}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by title…"
          emptyTitle="No blog posts yet"
          emptyDescription="Create your first post to publish it to /blog."
          error={live ? error : null}
          onRetry={reload}
        />
      )}

      <Dialog open={open} onOpenChange={(next) => !next && closeDialog()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit "${editing.title}"` : "New blog post"}</DialogTitle>
            <DialogDescription>
              {editing ? "Slug changes take effect immediately — old links will 404." : "Leave the slug blank to derive one from the title."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <div className="grid gap-1.5">
              <Label htmlFor="blog-title">Title</Label>
              <Input id="blog-title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-slug">Slug {editing ? "" : "(optional)"}</Label>
              <Input
                id="blog-slug"
                placeholder={editing ? undefined : "auto-generated from title if left blank"}
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-excerpt">Excerpt</Label>
              <Textarea
                id="blog-excerpt"
                rows={2}
                required
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="blog-content">Content</Label>
              <Textarea
                id="blog-content"
                rows={12}
                required
                className="font-mono text-sm"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2.5">
              <Switch id="blog-published" checked={form.isPublished} onCheckedChange={(checked) => setForm((f) => ({ ...f, isPublished: checked }))} />
              <Label htmlFor="blog-published">Published</Label>
            </div>
            {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}
            <Button type="submit" disabled={saving} className="mt-1 w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Create post"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(next) => !next && setDeleteTarget(null)}
        title={deleteTarget ? `Delete "${deleteTarget.title}"?` : "Delete post?"}
        description="This can't be undone — the post will disappear from /blog immediately."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
