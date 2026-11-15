"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataGrid, type Column } from "@/components/data-grid";
import { formatDateTimeID } from "@/lib/format";
import type { AuditLog } from "@/lib/types";

const ACTION_TONES: Record<string, string> = {
  LOGIN: "bg-sky-500/10 text-sky-600 border-transparent",
  GENERATE_DOCUMENT: "bg-emerald-500/10 text-emerald-600 border-transparent",
  CREATE_TEMPLATE: "bg-violet-500/10 text-violet-600 border-transparent",
  UPDATE_TEMPLATE: "bg-violet-500/10 text-violet-600 border-transparent",
  CREATE_TRANSACTION: "bg-amber-500/10 text-amber-600 border-transparent",
  CREATE_CUSTOM_FIELD: "bg-rose-500/10 text-rose-600 border-transparent",
  DOWNLOAD_DOCUMENT: "bg-primary/10 text-primary border-transparent",
};

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => {
      api.listAuditLogs(search, page, pageSize).then((r) => {
        setItems(r.data);
        setTotal(r.total);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [search, page]);

  const columns: Column<AuditLog>[] = [
    {
      key: "action",
      label: "Aksi",
      render: (r) => (
        <Badge variant="secondary" className={`font-mono ${ACTION_TONES[r.action] ?? ""}`}>
          {r.action}
        </Badge>
      ),
    },
    {
      key: "user",
      label: "User",
      render: (r) => (
        <div>
          <p className="font-medium">{r.user_name}</p>
          <p className="text-[11.5px] text-muted-foreground">{r.module}</p>
        </div>
      ),
    },
    {
      key: "detail",
      label: "Detail",
      hideMobile: true,
      render: (r) => <span className="line-clamp-1 max-w-72">{r.detail}</span>,
    },
    {
      key: "created_at",
      label: "Waktu",
      render: (r) => formatDateTimeID(r.created_at),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Jejak aktivitas penting di seluruh aplikasi."
      />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari aksi, modul, user..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Tidak ada aktivitas" />

      <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted-foreground">
        <span>
          Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}
        </span>
        <div className="flex gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border px-2.5 py-1 disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border px-2.5 py-1 disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}
