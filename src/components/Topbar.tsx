import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Search, LogOut, User, Settings } from "lucide-react";
import { AccountDialog } from "@/components/AccountDialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationPanel } from "@/components/NotificationPanel";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { useSession } from "@/state/session";
import { getInitials } from "@/lib/utils";

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { userName, logout } = useSession();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountTab, setAccountTab] = useState<"profile" | "preferences">("profile");

  function openAccount(tab: "profile" | "preferences") {
    setAccountTab(tab);
    setAccountOpen(true);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button onClick={onMenuClick} className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      {title && <h2 className="hidden text-sm font-semibold text-foreground/80 md:block">{title}</h2>}

      <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search students, batches, invoices…" className="h-9 rounded-full bg-muted/60 pl-9" />
      </div>

      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <RoleSwitcher />
        <NotificationPanel />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full pr-1 hover:bg-muted/60">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary/10 text-primary">{getInitials(userName)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-foreground">{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openAccount("profile")}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openAccount("preferences")}>
              <Settings /> Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} initialTab={accountTab} />
    </header>
  );
}
