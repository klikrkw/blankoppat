"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Download, FileText, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { formatDateID } from "@/lib/format";
import { TransaksiSelect } from "@/components/transaksi-select";
import type { DocumentItem } from "@/lib/types";

export default function DokumenPage() {
  return (
    <Suspense fallback={null}>
      <DokumenPageContent />
    </Suspense>
  );
}

function DokumenPageContent() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [transaksiFilter, setTransaksiFilter] = useState("");
  const pageSize = 10;
  const searchParams = useSearchParams();
  const txFilter = searchParams.get("tx") ?? "";

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .listDocuments(search, page, pageSize, status === "all" ? "" : status, transaksiFilter)
        .then((r) => {
          setDocs(r.data);
          setTotal(r.total);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [search, page, status, transaksiFilter]);

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        const matchTx = !txFilter || d.transaction_id === txFilter;
        return matchTx;
      }),
    [docs, txFilter]
  );

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const blob = await api.downloadDocument(doc.id);
      downloadBlob(blob, `${doc.document_number}.docx`);
      toast.success("Dokumen berhasil diunduh", {
        description: `${doc.document_number}.docx`,
      });
    } catch (e) {
      toast.error("Gagal mengunduh dokumen", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Semua Dokumen"
        description="Riwayat dokumen yang pernah dibuat beserta statusnya."
      >
        <Button asChild>
          <Link href="/dokumen/baru">
            <Plus className="size-4" /> Dokumen Baru
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari dokumen atau nomor dokumen..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="generated">Generated</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <TransaksiSelect value={transaksiFilter} onChange={(v) => { setTransaksiFilter(v); setPage(1); }} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumen"
          description="Buat dokumen baru dari transaksi Anda untuk memulai."
          action={
            <Button asChild>
              <Link href="/dokumen/baru">
                <Plus className="size-4" /> Buat Dokumen
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="hidden border shadow-none md:block">
            <CardContent className="p-0">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b text-[11.5px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-semibold">Dokumen</th>
                    <th className="px-4 py-3 font-semibold">No. Dokumen</th>
                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">Tanggal</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <Link href={`/dokumen/${d.id}`} className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileText className="size-4.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{d.title}</span>
                            <span className="text-[11.5px] text-muted-foreground">
                              {d.document_number}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px]">{d.document_number}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {formatDateID(d.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Unduh"
                          disabled={!d.generated_file}
                          onClick={() => handleDownload(d)}
                        >
                          <Download className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="space-y-3 md:hidden">
            {filtered.map((d) => (
              <Card key={d.id} className="border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dokumen/${d.id}`}
                        className="block truncate text-[13px] font-semibold hover:underline"
                      >
                        {d.title}
                      </Link>
                      <p className="font-mono text-[11.5px] text-muted-foreground">
                        {d.document_number}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <StatusBadge status={d.status} />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Unduh"
                          disabled={!d.generated_file}
                          onClick={() => handleDownload(d)}
                        >
                          <Download className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {filtered.length > 0 && (
        <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted-foreground">
          <span>
            Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
