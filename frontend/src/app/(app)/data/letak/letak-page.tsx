"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { DataGrid, type Column } from "@/components/data-grid";
import type { Letak } from "@/lib/types";

export default function LetakPage() {
  const [items, setItems] = useState<Letak[]>([]);

  useEffect(() => {
    api.listLetak().then(setItems);
  }, []);

  const columns: Column<Letak>[] = [
    {
      key: "nama_desa",
      label: "Nama Desa",
      render: (r) => <p className="font-medium">{r.nama_desa}</p>,
    },
    {
      key: "kecamatan",
      label: "Kecamatan",
      render: (r) => r.kecamatan ?? (r.kecamatan_id ? `Kecamatan ID ${r.kecamatan_id}` : "-"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Letak"
        description="Master data letak desa/kecamatan objek tanah."
      />
      <DataGrid items={items} columns={columns} emptyTitle="Belum ada data" />
    </div>
  );
}
