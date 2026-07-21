import { apiFetch } from "@/lib/api";

export interface ApiFloatingNote {
  id: string;
  content: string;
  color: string | null;
  sortOrder: number;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface SaveFloatingNoteRequest {
  content: string;
  color: string | null;
  sortOrder: number;
}

/** The signed-in user's own floating notes — private to that user. */
export async function listMyNotes(): Promise<ApiFloatingNote[]> {
  return apiFetch<ApiFloatingNote[]>("/api/notes");
}

export async function createNote(request: SaveFloatingNoteRequest): Promise<ApiFloatingNote> {
  return apiFetch<ApiFloatingNote>("/api/notes", { method: "POST", body: JSON.stringify(request) });
}

export async function updateNote(id: string, request: SaveFloatingNoteRequest): Promise<ApiFloatingNote> {
  return apiFetch<ApiFloatingNote>(`/api/notes/${id}`, { method: "PUT", body: JSON.stringify(request) });
}

export async function deleteNote(id: string): Promise<void> {
  await apiFetch<void>(`/api/notes/${id}`, { method: "DELETE" });
}
