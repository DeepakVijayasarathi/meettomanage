import type { ChatMessage, ClassSession, Participant } from "@/types";
import { CHILDREN, getChildById } from "@/data/children";
import { CHART_PALETTE } from "@/lib/roles";

/** Builds a live roster (teacher + students) for a session, padding with a couple of
 * filler children when a session has too few real participants so the "flagship" screen
 * never looks empty (e.g. holiday/leave/demo sessions with zero childIds). */
export function buildParticipants(session: ClassSession): Participant[] {
  const teacher: Participant = {
    id: `p-${session.teacherId}`,
    name: session.teacherName,
    role: "teacher",
    micOn: true,
    camOn: true,
    handRaised: false,
    avatarColor: CHART_PALETTE[0],
    speaking: true,
  };

  const usedIds = new Set(session.childIds);
  const real = session.childIds
    .map(getChildById)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const filler = real.length >= 2 ? [] : CHILDREN.filter((c) => !usedIds.has(c.id)).slice(0, 3 - real.length);

  const roster = [...real, ...filler];

  const students: Participant[] = roster.map((child, i) => ({
    id: child.id,
    name: child.name,
    role: "student",
    micOn: i % 3 !== 1,
    camOn: i % 2 === 0,
    handRaised: false,
    avatarColor: child.avatarColor,
    speaking: false,
  }));

  return [teacher, ...students];
}

export function buildInitialMessages(session: ClassSession, students: Participant[]): ChatMessage[] {
  const first = students[0]?.name.split(" ")[0] ?? "Everyone";
  return [
    {
      id: "m-1",
      author: session.teacherName,
      text: `Welcome everyone! Today we're covering "${session.title}" — get comfy and switch your camera on 🙂`,
      time: "4:29 PM",
    },
    {
      id: "m-2",
      author: first,
      text: "Hi teacher! I'm ready 🎉",
      time: "4:30 PM",
    },
    {
      id: "m-3",
      author: session.teacherName,
      text: "Great! We'll start with the whiteboard, then a quick quiz.",
      time: "4:30 PM",
    },
  ];
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export const QUIZ_BANK: QuizQuestion[] = [
  {
    id: "q-1",
    prompt: "Which letter makes the /f/ sound in 'phone'?",
    options: ["F", "V", "Ph", "Th"],
    correctIndex: 2,
  },
  {
    id: "q-2",
    prompt: "What is 7 + 6?",
    options: ["12", "13", "14", "11"],
    correctIndex: 1,
  },
  {
    id: "q-3",
    prompt: "Which word rhymes with 'cat'?",
    options: ["Dog", "Hat", "Cup", "Sun"],
    correctIndex: 1,
  },
  {
    id: "q-4",
    prompt: "How many sides does a triangle have?",
    options: ["2", "3", "4", "5"],
    correctIndex: 1,
  },
];

export interface LeaderboardEntry {
  id: string;
  name: string;
  color: string;
  stars: number;
}

export const LEADERBOARD_SEED: LeaderboardEntry[] = [
  { id: "c-1", name: "Aarav", color: CHART_PALETTE[1], stars: 24 },
  { id: "c-9", name: "Reyansh", color: CHART_PALETTE[4], stars: 21 },
  { id: "c-5", name: "Ananya", color: CHART_PALETTE[3], stars: 19 },
  { id: "c-10", name: "Sara", color: CHART_PALETTE[2], stars: 14 },
  { id: "c-7", name: "Vivaan", color: CHART_PALETTE[6], stars: 11 },
];
