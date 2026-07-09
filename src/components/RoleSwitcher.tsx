import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_META, ROLE_ORDER } from "@/lib/roles";
import { useSession } from "@/state/session";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const { role, setRole } = useSession();
  const navigate = useNavigate();
  const current = role ? ROLE_META[role] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full pl-2.5">
          {current && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full text-white" style={{ backgroundColor: current.hex }}>
              <current.icon className="h-3 w-3" />
            </span>
          )}
          <span className="hidden sm:inline">{current?.shortLabel ?? "Select portal"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch portal (demo)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLE_ORDER.map((r) => {
          const meta = ROLE_META[r];
          return (
            <DropdownMenuItem
              key={r}
              onClick={() => {
                setRole(r);
                navigate(meta.homePath);
              }}
              className={cn("justify-between", role === r && "bg-accent")}
            >
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: meta.hex }}>
                  <meta.icon className="h-3.5 w-3.5" />
                </span>
                {meta.shortLabel}
              </span>
              {role === r ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                !meta.available && (
                  <span title="Preview only">
                    <LockKeyhole className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                )
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
