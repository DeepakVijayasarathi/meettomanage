import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

// A minimal, dependency-free toast store (shadcn's own well-known pattern, trimmed to
// what this app actually needs) — module-level state outside React so any component can
// call toast() without being inside a specific provider's subtree, while <Toaster/>
// (mounted once near the app root) is the only thing that actually subscribes and renders.

const TOAST_LIMIT = 3;
// Toasts dismiss on their own timer (see DEFAULT_DURATION below); this is only the
// cleanup delay after a toast is dismissed before it's removed from the DOM entirely,
// long enough for Radix's own exit animation (~200ms, see toastVariants) to finish.
const TOAST_REMOVE_DELAY = 300;
const DEFAULT_DURATION = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "success" | "error" | "warning";
};

type Action =
  | { type: "ADD_TOAST"; toast: ToasterToast }
  | { type: "UPDATE_TOAST"; toast: Partial<ToasterToast> & { id: string } }
  | { type: "DISMISS_TOAST"; toastId?: string }
  | { type: "REMOVE_TOAST"; toastId?: string };

interface State {
  toasts: ToasterToast[];
}

const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function queueRemove(toastId: string) {
  if (timeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    timeouts.delete(toastId);
    dispatch({ type: "REMOVE_TOAST", toastId });
  }, TOAST_REMOVE_DELAY);
  timeouts.set(toastId, timeout);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_TOAST":
      return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) };
    case "UPDATE_TOAST":
      return {
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };
    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) queueRemove(toastId);
      else state.toasts.forEach((t) => queueRemove(t.id));
      return {
        toasts: state.toasts.map((t) => (t.id === toastId || toastId === undefined ? { ...t, open: false } : t)),
      };
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) return { toasts: [] };
      return { toasts: state.toasts.filter((t) => t.id !== action.toastId) };
    default:
      return state;
  }
}

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

let idCount = 0;
function genId() {
  idCount = (idCount + 1) % Number.MAX_SAFE_INTEGER;
  return idCount.toString();
}

type ToastInput = Omit<ToasterToast, "id">;

function toast({ duration = DEFAULT_DURATION, ...props }: ToastInput & { duration?: number }) {
  const id = genId();

  const update = (next: Partial<ToasterToast>) => dispatch({ type: "UPDATE_TOAST", toast: { ...next, id } });
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id });

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  // Auto-dismiss — Radix's own onOpenChange only fires from user interaction (swipe/click
  // the close button), not on a timer, so that has to be driven from here.
  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  };
}

export { useToast, toast };
