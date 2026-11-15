"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  AlertTriangle,
  FileText,
  Lock,
  Pencil,
  Plus,
  Save,
  ScrollText,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataGrid, type Column } from "@/components/data-grid";
import { cn } from "@/lib/utils";
import { formatDateID } from "@/lib/format";
import { TransaksiEditDialog } from "./transaksi-edit-dialog";
import type { JenisTransaksi, Surat, SuratCollectionItem, Transaksi } from "@/lib/types";

export default function TransaksiPage() {
  const [jenisList, setJenisList] = useState<JenisTransaksi[]>([]);
  const [selectedJenis, setSelectedJenis] = useState<number | null>(null);
  const [collection, setCollection] = useState<SuratCollectionItem[]>([]);
  const [transaksiList, setTransaksiList] = useState<
    (Transaksi & { jenistransaksi?: { nama_jenistransaksi: string } })[]
  >([]);
  const [availableSurat, setAvailableSurat] = useState<Surat[]>([]);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaksi & { jenistransaksi?: { nama_jenistransaksi: string } } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(Transaksi & { jenistransaksi?: { nama_jenistransaksi: string } }) | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const txPageSize = 10;

  const refreshAvailable = (collection: SuratCollectionItem[], all: Surat[]) => {
    const ids = new Set(collection.map((x) => x.id));
    setAvailableSurat(all.filter((s) => !ids.has(s.id)));
  };

  const loadTransaksiList = () =>
    api.listTransaksi(txSearch, txPage, txPageSize).then((r) => {
      setTransaksiList(r.data);
      setTxTotal(r.total);
    });

  useEffect(() => {
    api.listJenistransaksi().then(setJenisList);
    api.listSurat().then(setAvailableSurat);
  }, []);

  useEffect(() => {
    const t = setTimeout(loadTransaksiList, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txSearch, txPage]);

  useEffect(() => {
    if (selectedJenis === null) return;
    api.getSuratCollection(selectedJenis).then((c) => {
      setCollection(c);
      api.listSurat().then((all) => refreshAvailable(c, all));
    });
  }, [selectedJenis]);

  const handleDeleteTransaksi = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTransaksi(deleteTarget.id);
      toast.success("Transaksi beserta dokumennya dihapus");
      setDeleteTarget(null);
      loadTransaksiList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus transaksi");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveCollection = async () => {
    if (selectedJenis === null) return;
    setSaving(true);
    try {
      await api.saveSuratCollection(
        selectedJenis,
        collection.map((s, i) => ({
          surat_id: s.id,
          urutan: i + 1,
          wajib: s.wajib,
          default_selected: s.default_selected,
        }))
      );
      toast.success("Koleksi surat disimpan");
      api.listJenistransaksi().then(setJenisList);
      const c = await api.getSuratCollection(selectedJenis);
      setCollection(c);
      const all = await api.listSurat();
      refreshAvailable(c, all);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan koleksi surat");
    } finally {
      setSaving(false);
    }
  };

  const selectedJenisName = useMemo(
    () => jenisList.find((j) => j.id === selectedJenis)?.nama_jenistransaksi,
    [jenisList, selectedJenis]
  );

  const addSurat = (suratId: string) => {
    const s = availableSurat.find((x) => x.id === suratId);
    if (!s) return;
    const item: SuratCollectionItem = {
      ...s,
      urutan: collection.length + 1,
      wajib: false,
      default_selected: false,
      is_active: true,
    };
    setCollection((c) => [...c, item]);
    setAvailableSurat((a) => a.filter((x) => x.id !== suratId));
    toast.success(`"${s.nama_surat}" ditambahkan ke koleksi`);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setCollection((c) => {
      const next = [...c];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return c;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((x, i) => ({ ...x, urutan: i + 1 }));
    });
  };

  const txColumns: Column<Transaksi & { jenistransaksi?: { nama_jenistransaksi: string } }>[] = [
    {
      key: "nomor_transaksi",
      label: "Nomor",
      render: (r) => (
        <div>
          <p className="font-medium">{r.nomor_transaksi}</p>
          <p className="text-[11.5px] text-muted-foreground">{r.judul}</p>
        </div>
      ),
    },
    {
      key: "jenistransaksi",
      label: "Jenis Transaksi",
      hideMobile: true,
      render: (r) => r.jenistransaksi?.nama_jenistransaksi ?? "-",
    },
    {
      key: "tanggal",
      label: "Tanggal",
      hideMobile: true,
      render: (r) => formatDateID(r.tanggal_transaksi),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-8"
            aria-label="Lihat dokumen"
          >
            <Link href={`/dokumen?tx=${r.id}`}>
              <FileText className="size-4" />
            </Link>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => setEditTarget(r)}
            aria-label="Edit transaksi"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive"
            onClick={() => setDeleteTarget(r)}
            aria-label="Hapus transaksi"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Transaksi"
        description="Kelola jenis transaksi, koleksi surat, dan daftar transaksi."
      />

      <Tabs defaultValue="jenis">
        <TabsList>
          <TabsTrigger value="jenis">Jenis Transaksi & Surat</TabsTrigger>
          <TabsTrigger value="daftar">Daftar Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="jenis" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                Jenis Transaksi
              </p>
              {jenisList.map((j) => (
                <button
                  key={j.id}
                  onClick={() => setSelectedJenis(j.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border bg-card px-4 py-3 text-left transition-all hover:border-primary/50",
                    selectedJenis === j.id
                      ? "border-primary ring-2 ring-primary/15"
                      : "border-border"
                  )}
                >
                  <span className="font-medium">{j.nama_jenistransaksi}</span>
                  <Badge variant="secondary">{j.id}</Badge>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2">
              <Card className="border shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-[15px]">
                      Koleksi Surat — {selectedJenisName ?? "pilih jenis transaksi"}
                    </CardTitle>
                    {selectedJenis !== null && (
                      <Button size="sm" onClick={handleSaveCollection} disabled={saving}>
                        <Save className="size-3.5" />
                        {saving ? "Menyimpan..." : "Simpan Koleksi"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedJenis === null ? (
                    <EmptyState
                      icon={ScrollText}
                      title="Pilih jenis transaksi"
                      description="Pilih salah satu jenis transaksi di kiri untuk melihat koleksi surat."
                    />
                  ) : collection.length === 0 ? (
                    <EmptyState
                      icon={ScrollText}
                      title="Koleksi kosong"
                      description="Tambahkan surat/template ke koleksi jenis transaksi ini."
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {collection.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex flex-col gap-2 rounded-xl border p-3.5 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-semibold">{s.nama_surat}</p>
                              {s.wajib && (
                                <Badge variant="secondary" className="gap-1">
                                  <Lock className="size-3" /> Wajib
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11.5px] text-muted-foreground">
                              {s.jenis_surat} · Template ID {s.template_id}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-4 text-[11.5px]">
                              <label className="flex items-center gap-1.5">
                                <Switch
                                  checked={s.wajib}
                                  onCheckedChange={(v) =>
                                    setCollection((c) =>
                                      c.map((x) =>
                                        x.id === s.id ? { ...x, wajib: v, default_selected: v || x.default_selected } : x
                                      )
                                    )
                                  }
                                />
                                Wajib
                              </label>
                              <label className="flex items-center gap-1.5">
                                <Switch
                                  checked={s.default_selected}
                                  onCheckedChange={(v) =>
                                    setCollection((c) =>
                                      c.map((x) => (x.id === s.id ? { ...x, default_selected: v } : x))
                                    )
                                  }
                                />
                                Default terpilih
                              </label>
                              <label className="flex items-center gap-1.5">
                                <Switch
                                  checked={s.is_active}
                                  onCheckedChange={(v) =>
                                    setCollection((c) =>
                                      c.map((x) => (x.id === s.id ? { ...x, is_active: v } : x))
                                    )
                                  }
                                />
                                Aktif
                              </label>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Naik"
                              disabled={idx === 0}
                              onClick={() => move(idx, -1)}
                            >
                              <ArrowUpDown className="size-3.5 rotate-180" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Turun"
                              disabled={idx === collection.length - 1}
                              onClick={() => move(idx, 1)}
                            >
                              <ArrowUpDown className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setCollection((c) => c.filter((x) => x.id !== s.id));
                                setAvailableSurat((a) =>
                                  a.some((x) => x.id === s.id)
                                    ? a
                                    : [
                                        ...a,
                                        {
                                          id: s.id,
                                          template_id: s.template_id ?? null,
                                          jenis_surat: s.jenis_surat,
                                          nama_surat: s.nama_surat,
                                          keterangan: s.keterangan ?? "",
                                        },
                                      ]
                                );
                              }}
                            >
                              Lepas
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedJenis !== null && availableSurat.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <p className="mb-2 text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Tambah Surat ke Koleksi
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableSurat.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => addSurat(s.id)}
                            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition-colors hover:border-primary/50 hover:text-primary"
                          >
                            <Plus className="size-3.5" /> {s.nama_surat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daftar" className="mt-4">
          <div className="relative mb-4 max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={txSearch}
              onChange={(e) => {
                setTxSearch(e.target.value);
                setTxPage(1);
              }}
              placeholder="Cari nomor, judul, keterangan transaksi..."
              className="pl-9"
            />
          </div>
          <DataGrid
            items={transaksiList}
            columns={txColumns}
            emptyTitle="Belum ada transaksi"
            emptyDescription="Buat transaksi melalui menu Dokumen Baru."
          />
          <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted-foreground">
            <span>
              Menampilkan {(txPage - 1) * txPageSize + 1}–
              {Math.min(txPage * txPageSize, txTotal)} dari {txTotal}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={txPage <= 1}
                onClick={() => setTxPage((p) => p - 1)}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={txPage * txPageSize >= txTotal}
                onClick={() => setTxPage((p) => p + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <TransaksiEditDialog
        target={editTarget}
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        onSaved={loadTransaksiList}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi <span className="font-semibold text-foreground">{deleteTarget?.judul}</span>{" "}
              beserta seluruh dokumennya akan dihapus permanen dan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTransaksi();
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
