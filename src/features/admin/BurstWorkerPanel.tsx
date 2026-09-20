import { useState } from "react";
import { Clock, Disc, DollarSign, Play, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { apiEnabled } from "@/lib/api";
import { startBurstWorker, stopBurstWorker } from "@/api/monitoring";
import type { BurstWorkerControlResult, BurstWorkerEpisode, BurstWorkerUsage } from "@/types";
import { StatTile } from "./monitoringShared";

const HOLD_OPTIONS = [
  { minutes: 60, label: "1 hour" },
  { minutes: 120, label: "2 hours" },
  { minutes: 240, label: "4 hours" },
  { minutes: 480, label: "8 hours" },
];

const usd = (n: number) => `$${n.toFixed(2)}`;
/** The hourly rate needs its 4th decimal ($0.1763), unlike the cost totals. */
const rateLabel = (n: number) => `$${n.toFixed(4)}`;
const shortTime = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function formatDuration(hours: number): string {
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** "2026-09-19T01:10:37Z pull[...]: copied x" -> "6:40:37 AM  pull[...]: copied x" (local time, like the rest of the page). */
function formatActivityLine(line: string): { time: string; text: string } {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) (.*)$/.exec(line);
  if (!match) return { time: "", text: line };
  return { time: new Date(match[1]).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" }), text: match[2] };
}

function TriggerCell({ episode }: { episode: BurstWorkerEpisode }) {
  if (episode.trigger === "manual") {
    return (
      <span className="flex flex-col items-start gap-0.5">
        <Badge variant="warning" className="text-[10px]">Manual</Badge>
        {episode.requestedBy && <span className="max-w-[140px] truncate text-[11px] text-muted-foreground">{episode.requestedBy}</span>}
      </span>
    );
  }
  return <Badge variant="secondary" className="text-[10px]">Auto</Badge>;
}

/**
 * The on-demand Hetzner burst recording server, in one place: is it running, what has it cost, what
 * did that money buy, and the emergency Start now / Stop buttons. Always rendered (even before the
 * server has ever been used) so the manual override is there when it's actually needed.
 */
export function BurstWorkerPanel({ usage, canManage, onChanged }: { usage: BurstWorkerUsage | null; canManage: boolean; onChanged: () => void }) {
  const [startOpen, setStartOpen] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const [holdMinutes, setHoldMinutes] = useState(120);
  const [lastResult, setLastResult] = useState<BurstWorkerControlResult | null>(null);

  const status = usage?.status;
  const running = status?.known ? status.exists : usage?.currentlyActive ?? false;
  const holdUntil = status?.holdUntilUtc && new Date(status.holdUntilUtc) > new Date() ? status.holdUntilUtc : null;
  const showControls = canManage && apiEnabled();
  const rate = usage?.hourlyRateUsd ?? 0;

  async function handleStart() {
    const result = await startBurstWorker(holdMinutes);
    setLastResult(result);
    onChanged();
  }

  async function handleStop() {
    const result = await stopBurstWorker();
    setLastResult(result);
    onChanged();
  }

  return (
    <Card className="mt-4 p-5">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 p-0 pb-4">
        <div>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Burst Recording Capacity
            {!usage || !status ? (
              <Badge variant="muted">Usage unavailable</Badge>
            ) : !status.known ? (
              <Badge variant="warning">Status unknown</Badge>
            ) : running ? (
              <Badge variant="success" className="gap-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Running
              </Badge>
            ) : (
              <Badge variant="secondary">Standby</Badge>
            )}
            {holdUntil && <Badge variant="outline">Held until {new Date(holdUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Badge>}
          </CardTitle>
          <CardDescription className="mt-1 max-w-2xl">
            An extra recording server that turns on by itself when the Recording Worker gets busy, and off again once everything is safely copied.
            {rate > 0 && <> Billed by the hour ({rateLabel(rate)}/hr) only while it exists.</>}
          </CardDescription>
        </div>
        {showControls && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setStartOpen(true)}>
              <Play className="h-3.5 w-3.5" />
              Start now (emergency)
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStopOpen(true)} disabled={status?.known && !running}>
              <Square className="h-3.5 w-3.5" />
              Stop when idle
            </Button>
          </div>
        )}
      </CardHeader>

      {lastResult && (
        <div className="mb-4 rounded-lg border bg-muted/40 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">Last action: {lastResult.action}</p>
            <button type="button" className="text-[11px] text-muted-foreground hover:underline" onClick={() => setLastResult(null)}>
              Dismiss
            </button>
          </div>
          {lastResult.logTail.length === 0 ? (
            <p className="text-xs text-muted-foreground">No log output.</p>
          ) : (
            <ul className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
              {lastResult.logTail.map((line, i) => {
                const { time, text } = formatActivityLine(line);
                return (
                  <li key={i} className="break-words">
                    <span className="mr-2 text-foreground/70">{time}</span>
                    {text}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {usage && (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              icon={DollarSign}
              label="Today"
              value={usd(usage.estimatedCostTodayUsd)}
              detail={`${usage.episodesToday}× · ${usage.hoursToday.toFixed(2)} h · ${usage.recordingsHandledToday} recordings`}
            />
            <StatTile
              icon={Clock}
              label="This month"
              value={usd(usage.estimatedCostThisMonthUsd)}
              detail={`${usage.episodesThisMonth}× · ${usage.hoursThisMonth.toFixed(2)} h · ${usage.recordingsHandledThisMonth} recordings`}
            />
            <StatTile
              icon={Disc}
              label="All time"
              value={usd(usage.estimatedCostAllTimeUsd)}
              detail={`${usage.episodesAllTime}× · ${usage.hoursAllTime.toFixed(2)} h`}
            />
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            Estimates are per minute actually run, from our own timestamps — not a Hetzner invoice. If Hetzner bills every started hour in full, the worst case is{" "}
            <span className="font-medium text-foreground">
              {usd(usage.maxBilledCostTodayUsd)} today · {usd(usage.maxBilledCostThisMonthUsd)} this month · {usd(usage.maxBilledCostAllTimeUsd)} all time
            </span>
            . Check your Hetzner invoice for the exact figure.
          </p>

          {usage.recentEpisodes.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">It hasn't been needed yet — no burst server has been created.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Ended</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Started by</TableHead>
                    <TableHead className="text-right">Recordings</TableHead>
                    <TableHead className="text-right">Est. cost</TableHead>
                    <TableHead className="text-right">Worst case</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usage.recentEpisodes.map((ep) => (
                    <TableRow key={ep.serverId}>
                      <TableCell className="whitespace-nowrap text-sm">{shortTime(ep.createdAtUtc)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {ep.deletedAtUtc ? (
                          shortTime(ep.deletedAtUtc)
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Running
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatDuration(ep.durationHours)}</TableCell>
                      <TableCell>
                        <TriggerCell episode={ep} />
                      </TableCell>
                      <TableCell className="text-right text-sm">{ep.recordingsHandled}</TableCell>
                      <TableCell className="text-right text-sm">${ep.estimatedCostUsd.toFixed(3)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        ${ep.maxBilledCostUsd.toFixed(2)} <span className="text-[10px]">({ep.billedHours}h)</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {usage.recentActivity.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold text-foreground">Recent activity</p>
              <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border bg-muted/30 p-3 font-mono text-[11px] text-muted-foreground">
                {[...usage.recentActivity].reverse().map((line, i) => {
                  const { time, text } = formatActivityLine(line);
                  return (
                    <li key={i} className="break-words">
                      <span className="mr-2 text-foreground/70">{time}</span>
                      {text}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={startOpen}
        onOpenChange={setStartOpen}
        title="Start the burst server now?"
        description={
          <span className="block space-y-3">
            <span className="block">
              Creates an extra 8-core recording server right away (ready in about 1–2 minutes){rate > 0 ? <>, billed at about {rateLabel(rate)} per hour</> : null}. Use this if you expect
              heavy load or the automatic trigger isn't reacting.
            </span>
            <label className="block text-sm font-medium text-foreground">
              Keep it running for at least
              <select
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={holdMinutes}
                onChange={(e) => setHoldMinutes(Number(e.target.value))}
              >
                {HOLD_OPTIONS.map((o) => (
                  <option key={o.minutes} value={o.minutes}>
                    {o.label}
                    {rate > 0 ? ` (≈ ${usd((o.minutes / 60) * rate)})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <span className="block text-xs text-muted-foreground">
              It won't be shut down during this time even while idle, and it never stops a recording in progress. Afterwards it turns off automatically once everything is copied.
            </span>
          </span>
        }
        confirmLabel="Start server"
        onConfirm={handleStart}
      />

      <ConfirmDialog
        open={stopOpen}
        onOpenChange={setStopOpen}
        title="Stop the burst server when idle?"
        description="Removes any hold and shuts the server down as soon as it is safe — only once every recorder is idle and every recording is fully copied to the main server. If anything is still recording it stays up and is removed automatically the moment it is safe. This never cuts off a recording."
        confirmLabel="Stop when idle"
        onConfirm={handleStop}
      />
    </Card>
  );
}
