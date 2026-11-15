"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { pageTitles } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";

export function AppHeader({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const title =
    pageTitles[pathname] ??
    pageTitles["/" + pathname.split("/").slice(1, 2).join("/")] ??
    "Blanko PPAT";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Buka menu"
      >
        <Menu className="size-5" />
      </Button>
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 gap-2 rounded-full px-1.5 pr-2.5"
            >
              <span className="gradient-brand flex size-7 items-center justify-center rounded-full text-[11px] font-bold text-white">
                {user?.name?.charAt(0) ?? "U"}
              </span>
              <span className="hidden text-[13px] font-medium md:inline">
                {user?.name?.split(" ")[0]}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {user?.roles?.join(", ")}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => router.push("/settings")}
              className="gap-2"
            >
              <UserRound className="size-4" /> Profil & Pengaturan
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                logout();
                router.push("/login");
              }}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" /> Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
