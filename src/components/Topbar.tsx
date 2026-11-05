import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, User, Settings, Compass, Search } from "lucide-react";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/commandPalette";
import { START_TOUR_EVENT } from "@/components/AppTour";
import { AccountDialog } from "@/components/AccountDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NetworkStatus } from "@/components/NetworkStatus";
import { NotificationPanel } from "@/components/NotificationPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSession } from "@/state/session";
import { getInitials } from "@/lib/utils";
import { getViewAs } from "@/lib/authStorage";
import { exitViewAs } from "@/lib/viewAs";

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
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {title && <h2 className="hidden text-[13px] font-medium text-muted-foreground md:block">{title}</h2>}

      <button
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
        className="ml-2 hidden h-8 w-64 items-center gap-2 rounded-md border border-input bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground md:flex"
        aria-label="Search pages and actions"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="rounded border bg-muted px-1.5 font-sans text-[10px] font-medium">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <NetworkStatus />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-md text-muted-foreground md:hidden"
          aria-label="Search pages and actions"
          onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
        >
          <Search className="h-[18px] w-[18px]" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-md text-muted-foreground"
          aria-label="Start product tour"
          title="Product tour: a guided walk through your menu"
          onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}
        >
          <Compass className="h-[18px] w-[18px]" />
        </Button>
        <ThemeToggle />
        <NotificationPanel />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Account menu for ${userName}`}
              className="ml-1 flex items-center gap-2 rounded-full pr-1 hover:bg-muted/60"
            >
              <Avatar className="h-8 w-8">
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
            <DropdownMenuItem onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}>
              <Compass /> Product tour
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // A read-only "view as parent" tab closes instead of logging anyone out.
                if (getViewAs()) {
                  void exitViewAs();
                  return;
                }
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
