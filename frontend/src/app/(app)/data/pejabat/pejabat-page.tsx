"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataGrid, type Column } from "@/components/data-grid";
import { WilayahSelect } from "@/components/wilayah-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EktpRecord, Jabatan, Pejabat } from "@/lib/types";

const schema = z.object({
  jabatan_id: z.string(),
  role_name: z.enum(["kepala_desa", "perangkat_desa"]),
});

type FormValues = z.infer<typeof schema>;

const roleLabel = (value: string) =>
  value === "kepala_desa" ? "Kepala Desa" : "Perangkat Desa";

export default function PejabatPage() {
  const [items, setItems] = useState<Pejabat[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [jabatanList, setJabatanList] = useState<Jabatan[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pejabat | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pejabat | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [ektp, setEktp] = useState<EktpRecord | null>(null);
  const [wilayahId, setWilayahId] = useState<number | null>(null);
  const [ektpSearch, setEktpSearch] = useState("");
  const [ektpResults, setEktpResults] = useState<EktpRecord[]>([]);

  const {
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      jabatan_id: "",
      role_name: "perangkat_desa",
    },
  });

  const jabatanId = useWatch({ control, name: "jabatan_id" });
  const roleName = useWatch({ control, name: "role_name" });

  const load = () => {
    api.listPejabat(search, page, pageSize).then((r) => {
      setItems(r.data);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => {
    api
      .listJabatan("", 1, 1000)
      .then((r) => setJabatanList(r.data))
      .catch(() => setJabatanList([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api.listEktp(ektpSearch, 1, 8).then((r) => setEktpResults(r.data));
    }, 250);
    return () => clearTimeout(t);
  }, [ektpSearch, open]);

  const handleOpenCreate = () => {
    setEditing(null);
    setEktp(null);
    setWilayahId(null);
    setEktpSearch("");
    setEktpResults([]);
    reset({
      jabatan_id: "",
      role_name: "perangkat_desa",
    });
    setOpen(true);
  };

  const handleOpenEdit = (r: Pejabat) => {
    setEditing(r);
    setEktp(r.ektp ?? null);
    setWilayahId(r.wilayah_id ?? null);
    setEktpSearch("");
    setEktpResults([]);
    reset({
      jabatan_id: r.jabatan_id ? String(r.jabatan_id) : "",
      role_name: r.role_name === "kepala_desa" ? "kepala_desa" : "perangkat_desa",
    });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    if (!ektp) {
      toast.error("Pilih e-KTP pejabat");
      return;
    }
    const payload = {
      jabatan_id: values.jabatan_id ? Number(values.jabatan_id) : null,
      ektp_id: ektp.id,
      wilayah_id: wilayahId,
      role_name: values.role_name,
    };
    try {
      if (editing) {
        await api.updatePejabat(editing.id, payload);
        toast.success("Pejabat diperbarui");
      } else {
        await api.createPejabat(payload);
        toast.success("Pejabat ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pejabat");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePejabat(deleteTarget.id);
      toast.success("Pejabat dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus pejabat");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Pejabat>[] = [
    {
      key: "nama",
      label: "Pejabat",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="gradient-brand flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
            {r.nama?.charAt(0) || "?"}
          </span>
          <div>
            <p className="font-medium">{r.nama || "-"}</p>
            <p className="font-mono text-[11.5px] text-muted-foreground">{r.nik}</p>
          </div>
        </div>
      ),
    },
    {
      key: "nama_jabatan",
      label: "Jabatan",
      hideMobile: true,
      render: (r) => r.nama_jabatan || "-",
    },
    {
      key: "role_name",
      label: "Role",
      render: (r) => (
        <Badge variant="secondary">{roleLabel(r.role_name)}</Badge>
      ),
    },
    {
      key: "wilayah",
      label: "Wilayah",
      hideMobile: true,
      render: (r) =>
        r.wilayah ? (
          <span>
            {r.wilayah.desa}
            <span className="block text-[11px] text-muted-foreground">
              {r.wilayah.kecamatan}, {r.wilayah.kabupaten}
            </span>
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "transaksi_count",
      label: "Dipakai",
      hideMobile: true,
      render: (r) => (
        <span className="text-[12.5px] text-muted-foreground">
          {r.transaksi_count ?? 0} transaksi
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => handleOpenEdit(r)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive"
            onClick={() => setDeleteTarget(r)}
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
        title="Pejabat"
        description="Kelola master data pejabat desa/kelurahan."
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Pejabat
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari nama, NIK, jabatan, wilayah..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Pejabat tidak ditemukan" />

      <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted-foreground">
        <span>
          Menampilkan {total === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, total)} dari {total}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pejabat" : "Tambah Pejabat"}</DialogTitle>
            <DialogDescription>
              Data master pejabat. Hubungkan dengan transaksi lewat tab Pejabat
              pada form transaksi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Jabatan</Label>
                <Select
                  value={jabatanId}
                  onValueChange={(v) => setValue("jabatan_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jabatan" />
                  </SelectTrigger>
                  <SelectContent>
                    {jabatanList.map((j) => (
                      <SelectItem key={j.id} value={String(j.id)}>
                        {j.nama_jabatan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={roleName}
                  onValueChange={(v) =>
                    setValue("role_name", v as FormValues["role_name"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kepala_desa">Kepala Desa</SelectItem>
                    <SelectItem value="perangkat_desa">Perangkat Desa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>e-KTP *</Label>
              {ektp ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <UserCog className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{ektp.nama}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{ektp.nik}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => setEktp(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  Pilih dari hasil pencarian di bawah.
                </p>
              )}
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={ektpSearch}
                  onChange={(e) => setEktpSearch(e.target.value)}
                  placeholder="Cari nama atau NIK..."
                  className="pl-9"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border">
                {ektpResults.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                    Tidak ditemukan
                  </p>
                ) : (
                  ektpResults.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setEktp(e);
                        setEktpSearch("");
                        setEktpResults([]);
                      }}
                      className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-accent"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-medium">
                          {e.nama}
                        </span>
                        <span className="block font-mono text-[10.5px] text-muted-foreground">
                          {e.nik}
                        </span>
                      </span>
                      <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Wilayah</Label>
              <WilayahSelect value={wilayahId} onChange={setWilayahId} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus pejabat?</AlertDialogTitle>
            <AlertDialogDescription>
              Pejabat{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.nama}
              </span>{" "}
              ({deleteTarget?.nama_jabatan}) akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className={buttonVariants({ variant: "destructive" })}
            >
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
