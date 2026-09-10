import type { LiveClassSession, MonitoringSummary, SessionHistoryEntry, TimeSeriesPoint } from "@/types";

/** Deterministic, believable-looking last-hour trend — a gentle wave around a baseline, not noise. */
function mockHistory(baseline: number, amplitude: number): TimeSeriesPoint[] {
  const now = Date.parse("2026-08-23T05:00:00Z");
  const points: TimeSeriesPoint[] = [];
  for (let i = 30; i >= 0; i--) {
    const t = now - i * 2 * 60_000;
    const wave = Math.sin(i / 4) * amplitude;
    const drift = ((30 - i) / 30) * (amplitude * 0.4);
    const value = Math.max(1, Math.min(99, baseline + wave + drift));
    points.push({ timestamp: new Date(t).toISOString(), value: Math.round(value * 10) / 10 });
  }
  return points;
}

/** Demo-mode snapshot — a healthy, believable steady state for both production servers. */
export const MONITORING_SUMMARY: MonitoringSummary = {
  apiHealthy: true,
  databaseHealthy: true,
  databaseLatencyMs: 6.2,
  databaseInsights: {
    activeConnections: 8,
    maxConnections: 100,
    commitsPerSecond: 1.4,
    rollbacksPerSecond: 0.02,
    cacheHitRatioPercent: 99.6,
    databaseSizeMb: 142,
    deadlocksTotal: 0,
    locksHeld: 12,
  },
  concurrentClassroomUsers: 5,
  activeClassCount: 2,
  activeAlerts: [],
  generatedAtUtc: "2026-08-23T05:00:00Z",
  servers: [
    {
      name: "Jitsi / Video",
      hostname: "thereadernest.co.in",
      reachable: true,
      error: null,
      uptimeSeconds: 41 * 3600,
      loadAverage1m: 0.38,
      cpuCores: 4,
      cpuUsagePercent: 18,
      memoryUsedPercent: 46,
      memoryTotalMb: 8192,
      swapUsedPercent: 0,
      swapTotalMb: 4096,
      diskUsedPercent: 31,
      diskTotalGb: 80,
      networkRxMbps: 4.8,
      networkTxMbps: 12.3,
      diskReadMbps: 0.4,
      diskWriteMbps: 1.1,
      agentDataAgeSeconds: 22,
      services: [
        { name: "nginx", active: true },
        { name: "prosody", active: true },
        { name: "jicofo", active: true },
        { name: "jitsi-videobridge2", active: true },
        { name: "jibri", active: true },
      ],
      liveCalls: { activeConferences: 2, totalParticipants: 5 },
      // Recorder status is real-only (no fabricated demo numbers) -- comes from the live
      // Jibri autoscaler metrics via Prometheus, so demo mode shows it as absent, not fake.
      recorderStatus: null,
      cpuHistory: mockHistory(18, 6),
      memoryHistory: mockHistory(46, 4),
      callQuality: {
        averageRttMs: 38,
        incomingLossPercent: 0.2,
        outgoingLossPercent: 0.1,
        incomingBitrateKbps: 850,
        outgoingBitrateKbps: 1240,
        endpointsSendingAudio: 4,
        endpointsSendingVideo: 3,
        jvbStressPercent: 12,
        jvbHealthy: true,
      },
      diskForecast: { isFilling: false, daysUntilFull: null, trendGbPerDay: 0.3 },
      containerMetrics: [
        { name: "docker-jitsi-meet-jvb-1", cpuPercent: 12.9, memoryMb: 376 },
        { name: "docker-jitsi-meet-jibri-1", cpuPercent: 2.1, memoryMb: 210 },
        { name: "docker-jitsi-meet-jicofo-1", cpuPercent: 0.1, memoryMb: 187 },
        { name: "docker-jitsi-meet-prosody-1", cpuPercent: 0, memoryMb: 39 },
        { name: "docker-jitsi-meet-web-1", cpuPercent: 0, memoryMb: 20 },
      ],
      capacityTrend: { cpuAvg7dPercent: 14.2, cpuPeak7dPercent: 44, cpuWeekOverWeekChangePercent: 6.5, recordingAtCapacityPercent7d: 3.2 },
    },
    {
      name: "App / API",
      hostname: "thereadernest.in",
      reachable: true,
      error: null,
      uptimeSeconds: 12 * 24 * 3600,
      loadAverage1m: 0.71,
      cpuCores: 4,
      cpuUsagePercent: 27,
      memoryUsedPercent: 58,
      memoryTotalMb: 8192,
      swapUsedPercent: 0,
      swapTotalMb: 0,
      diskUsedPercent: 44,
      diskTotalGb: 100,
      networkRxMbps: 2.1,
      networkTxMbps: 3.4,
      diskReadMbps: 0.8,
      diskWriteMbps: 2.6,
      agentDataAgeSeconds: 18,
      services: [
        { name: "api", active: true },
        { name: "postgres", active: true },
        { name: "nginx", active: true },
      ],
      liveCalls: null,
      recorderStatus: null,
      cpuHistory: mockHistory(27, 8),
      memoryHistory: mockHistory(58, 3),
      callQuality: null,
      diskForecast: { isFilling: true, daysUntilFull: 46.5, trendGbPerDay: -0.9 },
      containerMetrics: [
        { name: "readernestbackend", cpuPercent: 8.4, memoryMb: 149 },
        { name: "postgres", cpuPercent: 1.2, memoryMb: 210 },
        { name: "nginx-proxy-manager", cpuPercent: 0.1, memoryMb: 42 },
      ],
      capacityTrend: { cpuAvg7dPercent: 22.8, cpuPeak7dPercent: 51, cpuWeekOverWeekChangePercent: -3.1, recordingAtCapacityPercent7d: null },
    },
  ],
};

/** Minutes-ago relative to real "now" (unlike mockHistory's fixed anchor) so "started Xm ago" always reads as a plausible just-happened join, not a stale demo artifact. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** Demo-mode snapshot for the "who's live right now" admin view. */
export const LIVE_USERS: LiveClassSession[] = [
  {
    sessionId: "demo-session-1",
    courseName: "Phonics Level 2",
    batchName: "Batch A · Tue/Thu",
    teacherName: "Ananya Rao",
    startedAtUtc: minutesAgo(14),
    scheduledEndAtUtc: new Date(Date.now() + 16 * 60_000).toISOString(),
    participants: [
      // Two connections for the same teacher -- demonstrates the multi-device badge.
      { userId: "u-teacher-1", name: "Ananya Rao", role: "teacher", joinedAtUtc: minutesAgo(14), connectionCount: 2, attendanceRecorded: true },
      { userId: "u-student-1", name: "Rehan Sheikh", role: "student", joinedAtUtc: minutesAgo(13), connectionCount: 1, attendanceRecorded: true },
      // Just joined -- attendance capture hasn't caught up yet, demonstrating that indicator.
      { userId: "u-student-2", name: "Meher Kaur", role: "student", joinedAtUtc: minutesAgo(12), connectionCount: 1, attendanceRecorded: false },
    ],
  },
  {
    sessionId: "demo-session-2",
    courseName: "Maths Foundations",
    batchName: null,
    teacherName: "Vikram Nair",
    startedAtUtc: minutesAgo(3),
    scheduledEndAtUtc: new Date(Date.now() + 27 * 60_000).toISOString(),
    participants: [
      { userId: "u-teacher-2", name: "Vikram Nair", role: "teacher", joinedAtUtc: minutesAgo(3), connectionCount: 1, attendanceRecorded: true },
      { userId: "u-student-3", name: "Ishaan Verma", role: "student", joinedAtUtc: minutesAgo(2), connectionCount: 1, attendanceRecorded: true },
    ],
  },
];

/** Minutes-from-now, for building a plausible today's schedule around the demo "now". */
function minutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/** Demo-mode snapshot for the "today's sessions" timeline — a mix of completed, live, and upcoming. */
export const SESSION_HISTORY: SessionHistoryEntry[] = [
  {
    sessionId: "demo-history-1",
    courseName: "Phonics Level 1",
    batchName: "Batch C · Mon/Wed/Fri",
    teacherName: "Priya Menon",
    scheduledStartAtUtc: minutesFromNow(-180),
    scheduledEndAtUtc: minutesFromNow(-135),
    actualStartAtUtc: minutesFromNow(-179),
    actualEndAtUtc: minutesFromNow(-136),
    status: "Completed",
    attendedCount: 5,
    expectedCount: 5,
  },
  {
    sessionId: "demo-session-1",
    courseName: "Phonics Level 2",
    batchName: "Batch A · Tue/Thu",
    teacherName: "Ananya Rao",
    scheduledStartAtUtc: minutesAgo(15),
    scheduledEndAtUtc: minutesFromNow(16),
    actualStartAtUtc: minutesAgo(14),
    actualEndAtUtc: null,
    status: "InProgress",
    attendedCount: 2,
    expectedCount: 4,
  },
  {
    sessionId: "demo-session-2",
    courseName: "Maths Foundations",
    batchName: null,
    teacherName: "Vikram Nair",
    scheduledStartAtUtc: minutesAgo(4),
    scheduledEndAtUtc: minutesFromNow(27),
    actualStartAtUtc: minutesAgo(3),
    actualEndAtUtc: null,
    status: "InProgress",
    attendedCount: 2,
    expectedCount: 2,
  },
  {
    sessionId: "demo-history-2",
    courseName: "Spoken English",
    batchName: "Batch D · Daily",
    teacherName: "Priya Menon",
    scheduledStartAtUtc: minutesFromNow(45),
    scheduledEndAtUtc: minutesFromNow(90),
    actualStartAtUtc: null,
    actualEndAtUtc: null,
    status: "Scheduled",
    attendedCount: 0,
    expectedCount: 6,
  },
];
