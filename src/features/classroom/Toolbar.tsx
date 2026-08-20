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
          className={cn(
            "h-9 w-9 shrink-0 rounded-full sm:h-11 sm:w-11",
            !danger && !active && "bg-white/10 text-white hover:bg-white/20"
          )}
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
      {/* Smaller buttons/gaps/icons below sm, plus overflow-x-auto as a safety net: at
          h-11/gap-2 size this pill (8 buttons + 2 dividers, teacher mode) runs wider than
          a 375px viewport and was clipping the mic button on one end and Leave on the
          other with no way to reach them. shrink-0 on every button keeps them from being
          squashed unevenly if the row ever does need to scroll. */}
      <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-white/10 bg-brand-navy/90 px-1.5 py-1.5 shadow-pop backdrop-blur sm:gap-2 sm:px-3 sm:py-2">
        <ToolbarButton label={micOn ? "Mute" : "Unmute"} danger={!micOn} onClick={onToggleMic}>
          {micOn ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
        </ToolbarButton>
        <ToolbarButton label={camOn ? "Turn off camera" : "Turn on camera"} danger={!camOn} onClick={onToggleCam}>
          {camOn ? <Video className="h-4 w-4 sm:h-5 sm:w-5" /> : <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" />}
        </ToolbarButton>
        <ToolbarButton label={screenSharing ? "Stop sharing" : "Share screen"} active={screenSharing} onClick={onToggleScreenShare}>
          <MonitorUp className="h-4 w-4 sm:h-5 sm:w-5" />
        </ToolbarButton>
        <ToolbarButton
          label={stageView === "whiteboard" ? "Switch to video" : "Open whiteboard"}
          active={stageView === "whiteboard"}
          onClick={onToggleStage}
        >
          <PresentationIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </ToolbarButton>

        <div className="mx-0 h-6 w-px shrink-0 bg-white/10 sm:mx-1 sm:h-7" />

        {mode === "student" ? (
          <ToolbarButton label={handRaised ? "Lower hand" : "Raise hand"} active={handRaised} onClick={onToggleHand}>
            <Hand className="h-4 w-4 sm:h-5 sm:w-5" />
          </ToolbarButton>
        ) : (
          <>
            <ToolbarButton label="Mute all" onClick={onMuteAll}>
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </ToolbarButton>
            <div className="relative shrink-0">
              <ToolbarButton label="Waiting room" active={waitingRoomOpen} onClick={onToggleWaitingRoom}>
                <VideoOnIcon className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <Circle className={cn("h-4 w-4 sm:h-5 sm:w-5", recording && "fill-current text-destructive")} />
          </ToolbarButton>
        )}

        <div className="mx-0 h-6 w-px shrink-0 bg-white/10 sm:mx-1 sm:h-7" />

        {mode === "teacher" ? (
          <ToolbarButton label="Launch live quiz" onClick={onLaunchQuiz}>
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </ToolbarButton>
        ) : (
          <ToolbarButton label="Celebrate!" onClick={onCelebrate}>
            <PartyPopper className="h-4 w-4 sm:h-5 sm:w-5" />
          </ToolbarButton>
        )}

        <Button
          size="icon"
          variant="destructive"
          className="h-9 w-9 shrink-0 rounded-full sm:h-11 sm:w-11"
          onClick={onLeave}
          title="Leave class"
          aria-label="Leave class"
        >
          <PhoneOff className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </TooltipProvider>
  );
}
