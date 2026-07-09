import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarCheck2,
  Flame,
  Info,
  Lock,
  Medal,
  PlayCircle,
  Sparkles,
  Star,
  Trophy,
  Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { getChildById } from "@/data/children";
import { getSessionsForChild } from "@/data/sessions";
import { getResourcesForBatch } from "@/data/resources";
import { LEADERBOARD_SEED } from "@/features/classroom/classroomData";
import { formatDate } from "@/lib/utils";

const CHILD_ID = "c-1";
const TODAY = "2026-07-09";

const BADGES = [
  { label: "Phonics Star", icon: BookOpen, earned: true, color: "#F08A1D" },
  { label: "7-Day Streak", icon: Flame, earned: true, color: "#EF4444" },
  { label: "Quiz Whiz", icon: Trophy, earned: true, color: "#EAB308" },
  { label: "Reading Rocket", icon: Sparkles, earned: false, color: "#8B5CF6" },
  { label: "Perfect Attendance", icon: CalendarCheck2, earned: false, color: "#17A9C9" },
];

export default function StudentDashboard() {
  const child = getChildById(CHILD_ID);

  if (!child) return null;

  const firstName = child.name.split(" ")[0];
  const todaySession = getSessionsForChild(child.id).find((s) => s.date === TODAY);
  const totalClasses = child.classesCompleted + child.classesRemaining;
  const progressPercent = totalClasses > 0 ? Math.round((child.classesCompleted / totalClasses) * 100) : 0;

  const leaderboard = [...LEADERBOARD_SEED].sort((a, b) => b.stars - a.stars);
  const myStars = leaderboard.find((l) => l.id === child.id)?.stars ?? 0;
  const myRank = leaderboard.findIndex((l) => l.id === child.id) + 1;

  const resources = getResourcesForBatch(child.batchId).filter((r) => r.type === "book" || r.type === "worksheet");

  const ringCircumference = 2 * Math.PI * 42;
  const ringOffset = ringCircumference - (progressPercent / 100) * ringCircumference;

  return (
    <div className="font-display">
      <PageHeader
        eyebrow="Preview — what your child sees"
        title={`Hey ${firstName}! 👋`}
        description={`This is a live look at the experience ${firstName} gets when he joins a class through your parent account — no separate student login needed.`}
      />

      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Students don&apos;t have their own login at The Reader Nest — they always learn through a parent&apos;s account. This screen is
          a demo of that kid-facing view, for sales calls and stakeholder walkthroughs.
        </p>
      </div>

      {/* Today's class — big, friendly, hard to miss */}
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
        {todaySession ? (
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-pop">
                <Video className="h-7 w-7" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-primary">
                  Today&apos;s Class
                </span>
                <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{todaySession.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  With {todaySession.teacherName} · {todaySession.startTime} · {todaySession.duration} minutes
                  {todaySession.childIds.length > 1 && " · with a friend from your batch"}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
              <Button size="lg" asChild className="w-full sm:w-auto">
                <Link to={`/parent/live/${todaySession.id}`}>
                  <Video className="h-4 w-4" />
                  Join Class
                </Link>
              </Button>
              <p className="text-center text-xs text-muted-foreground sm:text-right">You can join 10 minutes before it starts</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="h-7 w-7" />
            </span>
            <h2 className="text-xl font-bold text-foreground">No class today — enjoy the day off!</h2>
            <p className="max-w-md text-sm text-muted-foreground">Check back on your next scheduled day, or explore your books and worksheets below.</p>
          </div>
        )}
      </Card>

      {/* Progress, attendance & stars */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 96 96" className="h-24 w-24 -rotate-90">
              <circle cx="48" cy="48" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke={child.avatarColor}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground">{progressPercent}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Term Progress</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {child.classesCompleted} of {totalClasses} classes done
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{child.classesRemaining} classes to go</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Attendance</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground">
              <Flame className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">{child.attendancePercent}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-warning" style={{ width: `${child.attendancePercent}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {child.attendancePercent >= 90 ? "You're on fire — keep it up! 🔥" : "Nice work — every class counts!"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">My Stars</p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Star className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">{myStars} ⭐</p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {myRank > 0 ? `Ranked #${myRank} in your batch this month!` : "Earn stars by joining class and acing quizzes."}
          </p>
        </Card>
      </div>

      {/* Leaderboard + badges */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">Batch Leaderboard</h3>
              <p className="text-xs text-muted-foreground">Top stars earned this month</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {leaderboard.map((entry, i) => {
              const isMe = entry.id === child.id;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div
                  key={entry.id}
                  className={
                    isMe
                      ? "flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5"
                      : "flex items-center gap-3 rounded-xl px-3 py-2.5"
                  }
                >
                  <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">{medal ?? `#${i + 1}`}</span>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: entry.color }}
                  >
                    {entry.name.charAt(0)}
                  </span>
                  <p className="flex-1 truncate text-sm font-semibold text-foreground">
                    {entry.name} {isMe && <span className="text-primary">(You)</span>}
                  </p>
                  <span className="flex items-center gap-1 text-sm font-bold text-foreground">
                    {entry.stars} <Star className="h-3.5 w-3.5 fill-current text-amber-400" />
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Medal className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">My Badges</h3>
              <p className="text-xs text-muted-foreground">Collect them all by showing up and joining in!</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {BADGES.map((badge) => (
              <div
                key={badge.label}
                className={
                  badge.earned
                    ? "flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-3 py-4 text-center shadow-card"
                    : "flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-4 text-center opacity-60"
                }
              >
                <span
                  className="relative flex h-11 w-11 items-center justify-center rounded-full"
                  style={{ backgroundColor: badge.earned ? `${badge.color}1A` : undefined, color: badge.earned ? badge.color : undefined }}
                >
                  {badge.earned ? <badge.icon className="h-5 w-5" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </span>
                <p className="text-xs font-semibold leading-tight text-foreground">{badge.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Books & worksheets teaser */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-foreground">My Books &amp; Worksheets</h3>
              <p className="text-xs text-muted-foreground">Fresh reading and practice, picked for {firstName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/parent/resources">View all</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {resources.map((r) => (
            <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                {r.type === "book" ? <BookOpen className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{r.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.type === "book" ? "Storybook" : "Worksheet"} · Added {formatDate(r.uploadedOn)}
                </p>
              </div>
            </div>
          ))}
          <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-muted/10 p-4 text-center">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">New worksheet coming soon!</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
