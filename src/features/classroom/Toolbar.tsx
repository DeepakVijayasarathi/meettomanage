import {
  Circle,
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  PartyPopper,
  PhoneOff,
  PresentationIcon,
  Sparkles,
  Users,
  Video,
  VideoOff,
  Video as VideoOnIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ToolbarProps {
  mode: "teacher" | "student";
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  stageView: "video" | "whiteboard";
  handRaised: boolean;
  recording: boolean;
  waitingCount: number;
  waitingRoomOpen: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreenShare: () => void;
  onToggleStage: () => void;
  onToggleHand: () => void;
  onMuteAll: () => void;
  onToggleWaitingRoom: () => void;
  onToggleRecording: () => void;
  onLaunchQuiz: () => void;
  onCelebrate: () => void;
  onLeave: () => void;
}

function ToolbarButton({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={danger ? "destructive" : active ? "default" : "secondary"}
          className={cn("h-11 w-11 rounded-full", !danger && !active && "bg-white/10 text-white hover:bg-white/20")}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export default function Toolbar({
  mode,
  micOn,
  camOn,
  screenSharing,
  stageView,
  handRaised,
  recording,
  waitingCount,
  waitingRoomOpen,
  onToggleMic,
  onToggleCam,
  onToggleScreenShare,
  onToggleStage,
  onToggleHand,
  onMuteAll,
  onToggleWaitingRoom,
  onToggleRecording,
  onLaunchQuiz,
  onCelebrate,
  onLeave,
}: ToolbarProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/90 px-3 py-2 shadow-pop backdrop-blur">
        <ToolbarButton label={micOn ? "Mute" : "Unmute"} danger={!micOn} onClick={onToggleMic}>
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ToolbarButton>
        <ToolbarButton label={camOn ? "Turn off camera" : "Turn on camera"} danger={!camOn} onClick={onToggleCam}>
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </ToolbarButton>
        <ToolbarButton label={screenSharing ? "Stop sharing" : "Share screen"} active={screenSharing} onClick={onToggleScreenShare}>
          <MonitorUp className="h-5 w-5" />
        </ToolbarButton>
        <ToolbarButton
          label={stageView === "whiteboard" ? "Switch to video" : "Open whiteboard"}
          active={stageView === "whiteboard"}
          onClick={onToggleStage}
        >
          <PresentationIcon className="h-5 w-5" />
        </ToolbarButton>

        <div className="mx-1 h-7 w-px bg-white/10" />

        {mode === "student" ? (
          <ToolbarButton label={handRaised ? "Lower hand" : "Raise hand"} active={handRaised} onClick={onToggleHand}>
            <Hand className="h-5 w-5" />
          </ToolbarButton>
        ) : (
          <>
            <ToolbarButton label="Mute all" onClick={onMuteAll}>
              <Users className="h-5 w-5" />
            </ToolbarButton>
            <div className="relative">
              <ToolbarButton label="Waiting room" active={waitingRoomOpen} onClick={onToggleWaitingRoom}>
                <VideoOnIcon className="h-5 w-5" />
              </ToolbarButton>
              {waitingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-pink text-[10px] font-bold text-white">
                  {waitingCount}
                </span>
              )}
            </div>
          </>
        )}

        {mode === "teacher" && (
          <ToolbarButton label={recording ? "Stop recording" : "Start recording"} active={recording} onClick={onToggleRecording}>
            <Circle className={cn("h-5 w-5", recording && "fill-current text-destructive")} />
          </ToolbarButton>
        )}

        <div className="mx-1 h-7 w-px bg-white/10" />

        {mode === "teacher" ? (
          <ToolbarButton label="Launch live quiz" onClick={onLaunchQuiz}>
            <Sparkles className="h-5 w-5" />
          </ToolbarButton>
        ) : (
          <ToolbarButton label="Celebrate!" onClick={onCelebrate}>
            <PartyPopper className="h-5 w-5" />
          </ToolbarButton>
        )}

        <Button size="icon" variant="destructive" className="h-11 w-11 rounded-full" onClick={onLeave} title="Leave class" aria-label="Leave class">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
