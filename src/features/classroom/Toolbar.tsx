import {
  Circle,
  Hand,
  HelpCircle,
  MessageSquare,
  Mic,
  MicOff,
  MicOff as MuteAllIcon,
  MonitorUp,
  MoreVertical,
  PartyPopper,
  PhoneOff,
  PresentationIcon,
  Sparkles,
  Trophy,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SidePanel = "participants" | "chat" | "quiz" | "leaderboard";

interface ToolbarProps {
  mode: "teacher" | "student";
  title: string;
  elapsed: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  stageView: "video" | "whiteboard";
  handRaised: boolean;
  recording: boolean;
  panel: SidePanel | null;
  participantCount: number;
  waitingCount: number;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleStage: () => void;
  onToggleHand: () => void;
  onToggleRecording: () => void;
  onCelebrate: () => void;
  onBirthday: () => void;
  onMuteAll: () => void;
  onAskDoubt: () => void;
  onTogglePanel: (panel: SidePanel) => void;
  onLeave: () => void;
}

const icon = "h-5 w-5";

/** Round Meet-style control: charcoal by default, red when a device is off, blue when a mode is on. */
function ControlButton({
  label,
  state = "default",
  desktopOnly,
  onClick,
  children,
}: {
  label: string;
  state?: "default" | "off" | "on";
  /** Hidden on phones, where the action moves into the More menu (as Meet does). */
  desktopOnly?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          aria-pressed={state === "on" ? true : undefined}
          className={cn(
            "h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A3D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15181e] sm:h-12 sm:w-12",
            desktopOnly ? "hidden sm:flex" : "flex",
            state === "off" && "bg-[#ea4335] text-white hover:bg-[#d93025]",
            state === "on" && "bg-gradient-to-br from-[#F7931E] to-[#F2611A] text-white shadow-[0_0_0_1px_rgba(255,138,61,0.35)] hover:brightness-110",
            state === "default" && "bg-[#252a33] text-white hover:bg-[#313844]"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

/** Flat icon toggle on the right of the bar that opens a side panel (People, Chat, ...). */
function PanelButton({
  label,
  active,
  badge,
  alert,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  badge?: number;
  /** Highlighted badge (e.g. people knocking) instead of the neutral count. */
  alert?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A3D] sm:h-12 sm:w-12",
            active ? "bg-[#FF8A3D]/20 text-[#FF8A3D]" : "text-white hover:bg-white/10"
          )}
        >
          {children}
          {badge !== undefined && (
            <span
              className={cn(
                "absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ring-2 ring-[#15181e]",
                alert ? "bg-[#FFC24B] text-[#15181e]" : "bg-[#3a414e] text-white"
              )}
            >
              {badge}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function Toolbar(props: ToolbarProps) {
  const {
    mode, title, elapsed, micOn, camOn, screenSharing, stageView, handRaised, recording,
    panel, participantCount, waitingCount,
  } = props;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-5">
        {/* Left: elapsed time and class title, like Meet's "10:42 AM | abc-defg-hij" */}
        <div className="hidden min-w-0 items-center gap-3 text-white md:flex">
          <span className="text-base font-medium tabular-nums">{elapsed}</span>
          <span className="h-4 w-px bg-white/30" />
          <span className="truncate text-base font-medium">{title}</span>
          {recording && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#ea4335]/15 px-2.5 py-1 text-xs font-semibold text-[#f28b82]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#ea4335]" /> REC
            </span>
          )}
        </div>
        <div className="md:hidden" />

        {/* Centre: call controls */}
        <div className="flex items-center gap-2 overflow-x-auto sm:gap-3">
          <ControlButton label={micOn ? "Turn off microphone" : "Turn on microphone"} state={micOn ? "default" : "off"} onClick={props.onToggleMic}>
            {micOn ? <Mic className={icon} /> : <MicOff className={icon} />}
          </ControlButton>
          <ControlButton label={camOn ? "Turn off camera" : "Turn on camera"} state={camOn ? "default" : "off"} onClick={props.onToggleCam}>
            {camOn ? <Video className={icon} /> : <VideoOff className={icon} />}
          </ControlButton>
          {mode === "student" && (
            <ControlButton label={handRaised ? "Lower hand" : "Raise hand"} state={handRaised ? "on" : "default"} onClick={props.onToggleHand}>
              <Hand className={icon} />
            </ControlButton>
          )}
          <ControlButton label={screenSharing ? "Stop presenting" : "Present now"} desktopOnly state={screenSharing ? "on" : "default"} onClick={props.onToggleScreenShare}>
            <MonitorUp className={icon} />
          </ControlButton>
          <ControlButton
            label={stageView === "whiteboard" ? "Back to video" : "Open whiteboard"} desktopOnly
            state={stageView === "whiteboard" ? "on" : "default"}
            onClick={props.onToggleStage}
          >
            <PresentationIcon className={icon} />
          </ControlButton>
          {mode === "teacher" && (
            <ControlButton label={recording ? "Stop recording" : "Start recording"} desktopOnly state={recording ? "on" : "default"} onClick={props.onToggleRecording}>
              <Circle className={cn(icon, recording && "fill-[#ea4335] text-[#ea4335]")} />
            </ControlButton>
          )}
          <ControlButton label="Celebrate" desktopOnly onClick={props.onCelebrate}>
            <PartyPopper className={icon} />
          </ControlButton>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="More options"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#252a33] text-white transition-colors hover:bg-[#313844] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A3D] sm:h-12 sm:w-12"
                  >
                    <MoreVertical className={icon} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">More options</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="top" align="center" className="w-60 border-white/10 bg-[#1e222a] text-white">
              <div className="sm:hidden">
                <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={props.onToggleScreenShare}>
                  <MonitorUp className="h-5 w-5" /> {screenSharing ? "Stop presenting" : "Present now"}
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={props.onToggleStage}>
                  <PresentationIcon className="h-5 w-5" /> {stageView === "whiteboard" ? "Back to video" : "Open whiteboard"}
                </DropdownMenuItem>
                {mode === "teacher" && (
                  <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={props.onToggleRecording}>
                    <Circle className={cn("h-5 w-5", recording && "fill-[#ea4335] text-[#ea4335]")} /> {recording ? "Stop recording" : "Start recording"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={props.onCelebrate}>
                  <PartyPopper className="h-5 w-5" /> Celebrate
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
              </div>
              {mode === "teacher" ? (
                <>
                  <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={props.onBirthday}>
                    <span className="w-5 text-center text-base leading-none">🎂</span> Birthday celebration
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={props.onMuteAll}>
                    <MuteAllIcon className="h-5 w-5" /> Mute all students
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={props.onAskDoubt}>
                  <HelpCircle className="h-5 w-5" /> Ask a doubt
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={() => props.onTogglePanel("quiz")}>
                <Sparkles className="h-5 w-5" /> Live quiz
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 py-2.5 focus:bg-white/10 focus:text-white" onSelect={() => props.onTogglePanel("leaderboard")}>
                <Trophy className="h-5 w-5" /> Leaderboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={props.onLeave}
                aria-label="Leave class"
                className="flex h-10 w-14 shrink-0 items-center justify-center rounded-full bg-[#ea4335] text-white transition-colors hover:bg-[#d93025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A3D] sm:h-12 sm:w-16"
              >
                <PhoneOff className={icon} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Leave class</TooltipContent>
          </Tooltip>
        </div>

        {/* Right: side panels */}
        <div className="flex items-center justify-end gap-1">
          <div className="hidden items-center gap-1 sm:flex">
            <PanelButton label="Leaderboard" active={panel === "leaderboard"} onClick={() => props.onTogglePanel("leaderboard")}>
              <Trophy className={icon} />
            </PanelButton>
            <PanelButton label="Live quiz" active={panel === "quiz"} onClick={() => props.onTogglePanel("quiz")}>
              <Sparkles className={icon} />
            </PanelButton>
          </div>
          <PanelButton
            label={waitingCount > 0 ? `People — ${waitingCount} waiting to join` : "People"}
            active={panel === "participants"}
            badge={mode === "teacher" && waitingCount > 0 ? waitingCount : participantCount}
            alert={mode === "teacher" && waitingCount > 0}
            onClick={() => props.onTogglePanel("participants")}
          >
            <Users className={icon} />
          </PanelButton>
          <PanelButton label="Chat with everyone" active={panel === "chat"} onClick={() => props.onTogglePanel("chat")}>
            <MessageSquare className={icon} />
          </PanelButton>
        </div>
      </div>
    </TooltipProvider>
  );
}
