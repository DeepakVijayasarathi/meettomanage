import { useMemo, useState } from "react";
import { CalendarCheck2, PhoneCall, Sparkles, ThumbsDown, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CHART_PALETTE } from "@/lib/roles";
import { cn, formatDate, getInitials } from "@/lib/utils";
import { LEADS as INITIAL_LEADS, type ConversionStage, type Lead } from "./data";

type BoardStage = "Demo Completed" | "Follow-up" | "Enrolled" | "Not Interested";

const BOARD_STAGES: BoardStage[] = ["Demo Completed", "Follow-up", "Enrolled", "Not Interested"];

const STAGE_META: Record<BoardStage, { icon: LucideIcon; color: string; description: string }> = {
  "Demo Completed": { icon: CalendarCheck2, color: CHART_PALETTE[2], description: "Demo held, awaiting next step" },
  "Follow-up": { icon: PhoneCall, color: CHART_PALETTE[6], description: "In active follow-up with the parent" },
  Enrolled: { icon: Trophy, color: "hsl(var(--success))", description: "Converted — payment received" },
  "Not Interested": { icon: ThumbsDown, color: "hsl(var(--destructive))", description: "Not proceeding for now" },
};

const MOVE_OPTIONS: { value: BoardStage; label: string }[] = BOARD_STAGES.map((s) => ({ value: s, label: s }));

function isBoardStage(stage: ConversionStage): stage is BoardStage {
  return stage !== "Demo Scheduled";
}

export default function AdmissionConversion() {
  const [leads, setLeads] = useState<Lead[]>(() => INITIAL_LEADS.filter((l) => isBoardStage(l.conversionStage)));

  const columns = useMemo(() => {
    const grouped: Record<BoardStage, Lead[]> = { "Demo Completed": [], "Follow-up": [], Enrolled: [], "Not Interested": [] };
    for (const lead of leads) {
      if (isBoardStage(lead.conversionStage)) grouped[lead.conversionStage].push(lead);
    }
    return grouped;
  }, [leads]);

  function moveLead(leadId: string, stage: BoardStage) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, conversionStage: stage } : l)));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Conversion Board"
        description="Move leads through the pipeline as conversations progress. Drag isn't required — use the move menu on each card."
      />

      {leads.length === 0 ? (
        <EmptyState icon={Sparkles} title="No leads on the board yet" description="Leads appear here once their demo is completed." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {BOARD_STAGES.map((stage) => {
            const meta = STAGE_META[stage];
            const Icon = meta.icon;
            const stageLeads = columns[stage];
            return (
              <div key={stage} className="flex flex-col rounded-xl border border-border bg-muted/20">
                <div className="flex items-center gap-2.5 border-b border-border p-4">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                      {stage}
                      <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">{stageLeads.length}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-3">
                  {stageLeads.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      No leads here right now.
                    </p>
                  ) : (
                    stageLeads.map((lead) => (
                      <Card key={lead.id} className={cn("border-l-[3px]", "shadow-none")} style={{ borderLeftColor: meta.color }}>
                        <CardContent className="flex flex-col gap-2.5 p-3.5">
                          <div className="flex items-start gap-2.5">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback
                                style={{
                                  backgroundColor: `${CHART_PALETTE[lead.childName.length % CHART_PALETTE.length]}22`,
                                  color: CHART_PALETTE[lead.childName.length % CHART_PALETTE.length],
                                }}
                              >
                                {getInitials(lead.childName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{lead.childName}</p>
                              <p className="truncate text-xs text-muted-foreground">Parent: {lead.parentName}</p>
                            </div>
                          </div>

                          <Badge variant="outline" className="w-fit gap-1 text-xs">
                            <Sparkles className="h-3 w-3" /> {lead.recommendedCourse}
                          </Badge>

                          <p className="text-xs text-muted-foreground">Last contacted {formatDate(lead.lastContactedOn)}</p>

                          <Select value={lead.conversionStage} onValueChange={(v) => moveLead(lead.id, v as BoardStage)}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MOVE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  Move to: {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
