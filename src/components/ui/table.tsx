import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    // A table wider than its box scrolls sideways, which keyboard users can only do if the
    // scroll area can take focus. Only then is it made focusable, so tables that fit add no tab stop.
    const wrapRef = React.useRef<HTMLDivElement>(null);
    const [overflows, setOverflows] = React.useState(false);
    React.useEffect(() => {
      const el = wrapRef.current;
      if (!el) return;
      const update = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
      update();
      const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
      observer?.observe(el);
      if (el.firstElementChild) observer?.observe(el.firstElementChild);
      return () => observer?.disconnect();
    }, []);
    return (
      <div
        ref={wrapRef}
        className="relative w-full overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...(overflows ? { tabIndex: 0, role: "region", "aria-label": props["aria-label"] ?? "Table, scroll sideways for more" } : {})}
      >
        <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    );
  }
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b [&_tr]:border-border", className)} {...props} />
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t border-border bg-muted/40 font-medium", className)} {...props} />
  )
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-border transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted", className)} {...props} />
  )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("h-10 whitespace-nowrap px-4 text-left align-middle text-xs font-medium text-muted-foreground", className)}
      {...props}
    />
  )
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("whitespace-nowrap px-4 py-3 align-middle", className)} {...props} />
  )
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
