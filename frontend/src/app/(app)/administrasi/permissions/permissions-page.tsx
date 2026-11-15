"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const PERMISSIONS: { module: string; actions: string[] }[] = [
  { module: "template", actions: ["view", "create", "update", "delete"] },
  { module: "custom_field", actions: ["view", "create", "update", "delete"] },
  { module: "document", actions: ["view", "create", "download", "view_all", "manage_all"] },
  { module: "transaction", actions: ["view", "create", "update", "delete", "view_all", "manage_all"] },
  { module: "jenis_transaksi", actions: ["view", "create", "update", "delete"] },
  { module: "surat", actions: ["view", "create", "update", "delete", "manage_relation"] },
  { module: "party", actions: ["view", "create", "update", "delete"] },
  { module: "user", actions: ["view", "create", "update", "delete"] },
  { module: "role", actions: ["view", "create", "update", "delete"] },
  { module: "subscription", actions: ["view", "create", "cancel", "view_all", "manage_all"] },
  { module: "subscription_plan", actions: ["view", "create", "update", "delete"] },
  { module: "invoice", actions: ["view", "view_all", "manage_all"] },
  { module: "payment", actions: ["view", "view_all", "verify", "reject"] },
  { module: "bank_account", actions: ["view", "create", "update", "delete"] },
  { module: "audit_log", actions: ["view", "view_all"] },
  { module: "settings", actions: ["view", "update"] },
];

export default function PermissionsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return PERMISSIONS;
    return PERMISSIONS.map((m) => ({
      module: m.module,
      actions: m.actions.filter((a) => `${m.module}.${a}`.includes(q)),
    })).filter((m) => m.actions.length > 0);
  }, [search]);

  const total = PERMISSIONS.reduce((n, m) => n + m.actions.length, 0);

  return (
    <div>
      <PageHeader
        title="Permissions"
        description={`Daftar permission aplikasi (${total} total). Format: module.action.`}
      />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari permission..."
          className="pl-9"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <Card key={m.module} className="border shadow-none">
            <CardContent className="p-4">
              <p className="text-[13px] font-semibold">{m.module}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {m.actions.map((a) => (
                  <Badge key={a} variant="secondary" className="font-mono text-[11px]">
                    {m.module}.{a}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
