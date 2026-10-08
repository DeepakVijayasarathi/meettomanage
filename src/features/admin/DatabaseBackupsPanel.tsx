import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Download, Loader2, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { downloadDatabaseBackup, getDatabaseBackups, type ApiDatabaseBackup, type ApiDatabaseBackupList } from "@/api/monitoring";

const KIND_LABELS: Record<string, string> = {
  hourly: "Hourly",
  nightly: "Nightly",
  manual: "Manual copy",
};

/** Hourly backups run at :15, so anything past ~75 min means one was missed; past 3h is a real problem. */
const LATE_AFTER_MIN = 75;
const STALE_AFTER_MIN = 180;
const COLLAPSED_ROWS = 10;

function sizeLabel(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function minutesSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 60000);
}

function agoLabel(iso: string): string {
  const m = minutesSince(iso);
  if (m < 1.5) return "just now";
  if (m < 60) return `${Math.round(m)}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

function FreshnessBadge({ newest }: { newest: string | null }) {
  if (!newest || minutesSince(newest) > STALE_AFTER_MIN) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> {newest ? `Last backup ${agoLabel(newest)}` : "No scheduled backup found"}
      </Badge>
    );
  }
  if (minutesSince(newest) > LATE_AFTER_MIN) {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Last backup {agoLabel(newest)}
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="gap-1">
      <CheckCircle2 className="h-3 w-3" /> Last backup {agoLabel(newest)}
    </Badge>
  );
}

/**
 * Admin-only list of the live database's backup files on the app server, with one-click
 * download (each download is audit-logged server-side). Added after the 7 Oct 2026 incident,
 * when getting a backup off the server needed a root shell.
 */
export function DatabaseBackupsPanel() {
  const [data, setData] = useState<ApiDatabaseBackupList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDatabaseBackups());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the backup list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async (backup: ApiDatabaseBackup) => {
    setDownloading(backup.fileName);
    setDownloadError(null);
    try {
      await downloadDatabaseBackup(backup);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  };

  const backups = data?.backups ?? [];
  const visible = showAll ? backups : backups.slice(0, COLLAPSED_ROWS);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              Database backups
            </CardTitle>
            <CardDescription>
              Hourly and nightly copies of the live database on the App server, also copied off-site. Every backup is kept for 7 days.
              Every download is recorded in the audit log.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {data && <FreshnessBadge newest={data.newestScheduledAtUtc} />}
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Refresh backup list">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        </div>
      </CardHeader>

      {error ? (
        <p className="px-6 pb-6 text-sm text-destructive">{error}</p>
      ) : loading && !data ? (
        <p className="flex items-center gap-2 px-6 pb-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading backups…
        </p>
      ) : backups.length === 0 ? (
        <p className="px-6 pb-6 text-sm text-muted-foreground">No backup files found on the server.</p>
      ) : (
        <div className="px-2 pb-4">
          {downloadError && <p className="px-4 pb-2 text-sm text-destructive">{downloadError}</p>}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Taken</TableHead>
                <TableHead className="hidden md:table-cell">File</TableHead>
                <TableHead className="hidden sm:table-cell">Size</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((b) => (
                <TableRow key={`${b.folder}/${b.fileName}`}>
                  <TableCell>
                    <Badge variant={b.kind === "manual" ? "secondary" : "outline"}>{KIND_LABELS[b.kind] ?? b.kind}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(b.createdAtUtc).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    <span className="ml-2 text-xs text-muted-foreground">{agoLabel(b.createdAtUtc)}</span>
                  </TableCell>
                  <TableCell className="hidden max-w-[22rem] truncate font-mono text-xs text-muted-foreground md:table-cell" title={b.fileName}>
                    {b.fileName}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{sizeLabel(b.sizeBytes)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => void download(b)}
                      disabled={downloading !== null}
                      aria-label={`Download ${b.fileName}`}
                    >
                      {downloading === b.fileName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {backups.length > COLLAPSED_ROWS && (
            <div className="px-4 pt-2">
              <Button variant="link" size="sm" className="px-0" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show fewer" : `Show all ${backups.length} backups`}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
