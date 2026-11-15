"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { DataGrid, type Column } from "@/components/data-grid";
import type { JenisHak } from "@/lib/types";

export default function JenisHakPage() {
  const [items, setItems] = useState<JenisHak[]>([]);

  useEffect(() => {
    api.listJenishak().then(setItems);
  }, []);

  const columns: Column<JenisHak>[] = [
    {
      key: "nama_jenishak",
      label: "Nama Jenis Hak",
      render: (r) => (
        <div>
          <p className="font-medium">{r.nama_jenishak}</p>
          <p className="text-[11.5px] text-muted-foreground">
            Gunakan pada template: {`{{obyek.jenishak.nama_jenishak}}`}
          </p>
        </div>
      ),
    },
    {
      key: "singkatan",
      label: "Singkatan",
      render: (r) => <Badge variant="secondary" className="font-mono">{r.singkatan}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Jenis Hak"
        description="Master jenis hak atas tanah yang tersedia."
      />
      <DataGrid items={items} columns={columns} emptyTitle="Belum ada data" />
    </div>
  );
}
