import { useEffect, useState } from "react";

export type ToastVariant = "default" | "success" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Optional button, e.g. "See plans" on a plan-limit error. */
  action?: ToastAction;
}

interface ToastItem extends ToastInput {
  id: string;
}

const AUTO_DISMISS_MS = 4000;
/** Toasts with a button stay long enough to be clicked. */
const AUTO_DISMISS_WITH_ACTION_MS = 9000;

// Plan-limit errors (HTTP 402) get an upgrade button wherever the page shows them: lib/api.ts
// notes each 402 message, and the admin shell registers what "See plans" should do.
const PLAN_LIMIT_WINDOW_MS = 5000;
const planLimitMessages = new Map<string, number>();
let planLimitAction: ToastAction | null = null;

export function notePlanLimitMessage(message: string) {
  planLimitMessages.set(message, Date.now());
}

export function setPlanLimitAction(action: ToastAction | null) {
  planLimitAction = action;
}

function withPlanLimitAction(input: ToastInput): ToastInput {
  if (input.action || !planLimitAction || !input.description) return input;
  const at = planLimitMessages.get(input.description);
  return at !== undefined && Date.now() - at < PLAN_LIMIT_WINDOW_MS ? { ...input, action: planLimitAction } : input;
}

// Module-level store + subscriber list: toast() can be called from anywhere (including
// outside a component, e.g. an API interceptor), while every mounted <Toaster/> stays in
// sync with the same list via the same pattern the app already uses for branding (see
// lib/branding.ts's subscribe/notify), not a new state-management approach.
let toasts: ToastItem[] = [];
const listeners = new Set<(next: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function toast(input: ToastInput) {
  const id = `toast-${Math.random().toString(36).slice(2, 9)}`;
  const item = withPlanLimitAction(input);
  toasts = [...toasts, { id, ...item }];
  emit();
  setTimeout(() => dismissToast(id), item.action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS);
}

export function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function useToast() {
  const [state, setState] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return { toast, toasts: state, dismiss: dismissToast };
}
