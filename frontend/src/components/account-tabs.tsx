"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Update Profil", href: "/profile" },
  { label: "Ganti Password", href: "/profile/password" },
];

export function AccountTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-5 inline-flex rounded-lg border bg-muted/40 p-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
