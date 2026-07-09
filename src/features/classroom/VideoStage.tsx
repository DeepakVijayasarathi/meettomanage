import type { Participant } from "@/types";
import VideoTile from "./VideoTile";

interface VideoStageProps {
  participants: Participant[];
  boardAccess: Record<string, boolean>;
}

export default function VideoStage({ participants, boardAccess }: VideoStageProps) {
  const count = participants.length;
  const cols = count <= 1 ? "grid-cols-1" : count <= 4 ? "grid-cols-2" : count <= 9 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className={`grid ${cols} h-full auto-rows-fr content-center gap-3 overflow-y-auto p-4`}>
      {participants.map((p) => (
        <VideoTile key={p.id} participant={p} canDrawBoard={Boolean(boardAccess[p.id])} />
      ))}
    </div>
  );
}
