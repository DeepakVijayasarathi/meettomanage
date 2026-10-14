/**
 * "View as parent": a Relationship Manager opens a parent's portal read-only, in its own tab,
 * without ever knowing the parent's PIN. The RM's tab asks the API for a short-lived,
 * read-only token, opens /view-as in a new tab and hands the token over with postMessage
 * (same origin only). The new tab keeps that session in its own sessionStorage (see
 * authStorage.ts), so the RM's own login, in localStorage, is never touched.
 */
import { endViewAs } from "@/api/auth";
import { startViewAsParent } from "@/api/users";
import type { LoginResponse } from "@/api/types";
import { clearAuthStorage } from "@/lib/authStorage";

export const VIEW_AS_READY = "trn.viewAs.ready";
export const VIEW_AS_SESSION = "trn.viewAs.session";

export interface ViewAsSessionMessage {
  type: typeof VIEW_AS_SESSION;
  response: LoginResponse;
}

/**
 * Must be called straight from a click handler: the tab is opened before the API call, or the
 * browser's pop-up blocker would stop it. Rejects (and closes the blank tab) if the API refuses.
 */
export async function openViewAsParent(userId: string): Promise<void> {
  const tab = window.open("/view-as", "_blank");
  if (!tab) {
    throw new Error("Your browser blocked the new tab. Allow pop-ups for this site and try again.");
  }

  let response: LoginResponse;
  try {
    response = await startViewAsParent(userId);
  } catch (err) {
    tab.close();
    throw err;
  }

  // The new tab keeps saying "ready" until it gets its session, so it doesn't matter
  // whether it loaded before or after the API call above returned.
  const onMessage = (event: MessageEvent) => {
    if (event.source !== tab || event.origin !== window.location.origin || event.data?.type !== VIEW_AS_READY) return;
    window.removeEventListener("message", onMessage);
    clearTimeout(giveUp);
    tab.postMessage({ type: VIEW_AS_SESSION, response } satisfies ViewAsSessionMessage, window.location.origin);
  };
  window.addEventListener("message", onMessage);
  const giveUp = setTimeout(() => window.removeEventListener("message", onMessage), 30_000);
}

/** Leaves a view-as tab: records the end in the audit log, drops this tab's session, closes it. */
export async function exitViewAs(): Promise<void> {
  await endViewAs().catch(() => undefined);
  clearAuthStorage();
  window.close();
  // Only reached if the browser kept the tab open.
  window.location.replace("/view-as?ended=1");
}
