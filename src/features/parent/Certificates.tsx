import { Award, Download, Share2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApiData } from "@/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { apiEnabled, userMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { downloadMyCertificate, listMyCertificates, verifyUrl, type ApiCertificate } from "@/api/certificates";

/** Parent portal: each child's course-completion certificates, to download, print or share. */
export default function ParentCertificates() {
  const { toast } = useToast();
  const { data, error, reload, loading } = useApiData(() => listMyCertificates(), []);

  const download = async (c: ApiCertificate) => {
    try {
      await downloadMyCertificate(c);
    } catch (e) {
      toast({ variant: "error", title: "Couldn't download", description: userMessage(e, "Please try again.") });
    }
  };

  const share = async (c: ApiCertificate) => {
    const url = verifyUrl(c.code);
    const text = `${c.studentName.split(" ")[0]} completed ${c.courseName}!`;
    try {
      if (navigator.share) await navigator.share({ title: "Certificate of completion", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast({ variant: "success", title: "Link copied", description: "Anyone with the link can check the certificate is real." });
      }
    } catch {
      // Closing the share sheet is not an error.
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Learning" title="Certificates" description="Certificates appear here automatically when your child finishes a course." />
      {apiEnabled() && error ? (
        <Card><CardContent className="flex items-center justify-between gap-4 p-6 text-sm"><span>{error}</span><Button size="sm" variant="outline" onClick={reload}>Try again</Button></CardContent></Card>
      ) : data.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center">
          <Award className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">{loading ? "Loading…" : "No certificates yet"}</p>
          <p className="text-sm text-muted-foreground">When a course is completed, the certificate is ready to download and share here.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="flex items-center gap-3 bg-gradient-to-r from-primary/15 to-amber-200/30 p-4">
                <Award className="h-8 w-8 text-primary" />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.courseName}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.studentName}</p>
                </div>
              </div>
              <CardContent className="grid gap-3 p-4">
                <p className="text-xs text-muted-foreground">Issued {formatDate(c.issuedAtUtc)} · Code {c.code}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void download(c)}><Download className="mr-1.5 h-4 w-4" />Download</Button>
                  <Button size="sm" variant="outline" onClick={() => void share(c)}><Share2 className="mr-1.5 h-4 w-4" />Share</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
