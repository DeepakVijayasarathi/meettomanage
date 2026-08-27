import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

const VARIANT_ICON = {
  default: Info,
  success: CheckCircle2,
  error: AlertCircle,
  warning: TriangleAlert,
} as const;

/** Mounted once near the app root (see App.tsx) — every toast() call anywhere renders here. */
export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map(({ id, title, description, action, variant = "default", ...props }) => {
        const Icon = VARIANT_ICON[variant];
        return (
          <Toast key={id} variant={variant} {...props}>
            <Icon data-toast-icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1 pr-5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

export { ToastAction };
