import { useEffect, useState } from "react";

export type ToastVariant = "default" | "success" | "error";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastInput {
  id: string;
}

const AUTO_DISMISS_MS = 4000;

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
  toasts = [...toasts, { id, ...input }];
  emit();
  setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
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
