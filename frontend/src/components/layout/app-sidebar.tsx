"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileSignature, LogOut, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { navSections } from "@/lib/nav";
import { useAuth } from "@/lib/auth";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { UserSubscription } from "@/lib/types";

function BrandMark() {
  return (
    <div className="gradient-brand flex size-9 items-center justify-center rounded-xl text-white shadow-sm shadow-blue-500/30">
      <FileSignature className="size-5" />
    </div>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sub, setSub] = useState<UserSubscription | null>(null);

  useEffect(() => {
    api.getSubscription().then((s) => setSub(s.subscription));
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Menu terpanjang yang cocok dengan path aktif, agar submenu tidak ikut
  // tersorot bersama menu induknya (mis. /profile vs /profile/password).
  const activeHref = navSections
    .flatMap((section) => section.items)
    .filter(
      (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <BrandMark />
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-tight">
            Blanko <span className="text-primary">PPAT</span>
          </p>
          <p className="text-[11px] text-muted-foreground">Dokumen Otomatis</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 pb-1.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.href === "/dokumen/baru" && (
                      <Sparkles className="ml-auto size-3.5 text-primary/70" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-4">
        {sub && (
          <div className="mb-3 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Paket {sub.plan_name}</p>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 uppercase">
                {sub.status}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <Progress
                value={(sub.document_used / sub.document_limit) * 100}
                className="h-1.5"
              />
              <p className="text-[11px] text-muted-foreground">
                Kuota: {sub.document_used}/{sub.document_limit} dokumen
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <div className="gradient-brand flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
            {user?.name?.charAt(0) ?? "U"}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold">{user?.name}</p>
            <p className="truncate text-[10.5px] text-muted-foreground">
              {user?.roles?.join(", ")}
            </p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Keluar"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
