import { apiFetch } from "@/lib/api";

/**
 * Admin-authored whiteboard activity bank (GET/POST/PUT/DELETE /api/whiteboard-activities),
 * scoped by department and optionally narrowed to one course. Replaces what used to be one
 * hardcoded fruit/letter matching set (plus a fixed "sh" sound hotspot game) every class
 * shared regardless of subject — see GET /api/whiteboard-activities/for-session/{sessionId}
 * (getWhiteboardActivitiesForSession below), which is what the live classroom now actually
 * launches an activity from.
 */
export type WhiteboardActivityMode = "DragDrop" | "TagMatch" | "Hotspot";

export interface ApiWhiteboardActivityItem {
  id: string;
  emoji: string;
  /** Match text for DragDrop/TagMatch (e.g. a letter or number). Unused by Hotspot. */
  label: string | null;
  /** Whether this piece counts as a correct find in Hotspot mode. Unused otherwise. */
  isTarget: boolean;
  displayOrder: number;
}

export interface ApiWhiteboardActivity {
  id: string;
  departmentId: string;
  departmentName: string;
  courseId: string | null;
  courseName: string | null;
  mode: WhiteboardActivityMode;
  prompt: string;
  displayOrder: number;
  items: ApiWhiteboardActivityItem[];
}

export interface WhiteboardActivityItemInput {
  emoji: string;
  label?: string;
  isTarget: boolean;
}

export interface SaveWhiteboardActivityInput {
  /** Required when courseId is unset — ignored (derived from the course) when it is set. */
  departmentId?: string;
  courseId?: string;
  mode: WhiteboardActivityMode;
  prompt: string;
  displayOrder?: number;
  items: WhiteboardActivityItemInput[];
}

export async function listWhiteboardActivities(departmentId?: string, courseId?: string): Promise<ApiWhiteboardActivity[]> {
  const params = new URLSearchParams();
  if (departmentId) params.set("departmentId", departmentId);
  if (courseId) params.set("courseId", courseId);
  const qs = params.toString();
  return apiFetch<ApiWhiteboardActivity[]>(`/api/whiteboard-activities${qs ? `?${qs}` : ""}`);
}

export async function createWhiteboardActivity(input: SaveWhiteboardActivityInput): Promise<ApiWhiteboardActivity> {
  return apiFetch<ApiWhiteboardActivity>("/api/whiteboard-activities", { method: "POST", body: JSON.stringify(input) });
}

export async function updateWhiteboardActivity(id: string, input: SaveWhiteboardActivityInput): Promise<ApiWhiteboardActivity> {
  return apiFetch<ApiWhiteboardActivity>(`/api/whiteboard-activities/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export async function deleteWhiteboardActivity(id: string): Promise<void> {
  await apiFetch<void>(`/api/whiteboard-activities/${id}`, { method: "DELETE" });
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The resolved activity set for one live class — this course's own activities first, then
 *  the department's shared ones (the only pool a Demo session draws from). */
export async function getWhiteboardActivitiesForSession(sessionId: string | undefined): Promise<ApiWhiteboardActivity[]> {
  if (!sessionId || !GUID_RE.test(sessionId)) return [];
  return apiFetch<ApiWhiteboardActivity[]>(`/api/whiteboard-activities/for-session/${sessionId}`);
}
