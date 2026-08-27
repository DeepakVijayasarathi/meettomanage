import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Path for the leading home icon — defaults to the current portal's dashboard via `homeTo`. */
  homeTo?: string;
  className?: string;
}

/**
 * A trail above `PageHeader` for screens reached through a detail/drill-down, not every
 * screen — the sidebar + PageHeader title already orient a user on a flat list page, so
 * this only earns its space once there's an actual "A > B > C" depth to show (e.g.
 * Users > Jane Doe, or Enrollments > Application #128).
 */
export function Breadcrumb({ items, homeTo, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3 flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      {homeTo && (
        <>
          <Link to={homeTo} className="flex items-center rounded p-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Dashboard">
            <Home className="h-3.5 w-3.5" />
          </Link>
          {items.length > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
        </>
      )}
      <ol className="flex min-w-0 items-center gap-1.5">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Fragment key={`${item.label}-${idx}`}>
              <li className="min-w-0">
                {item.to && !isLast ? (
                  <Link to={item.to} className="truncate rounded font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {item.label}
                  </Link>
                ) : (
                  <span className={cn("truncate", isLast && "font-semibold text-foreground")} aria-current={isLast ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
