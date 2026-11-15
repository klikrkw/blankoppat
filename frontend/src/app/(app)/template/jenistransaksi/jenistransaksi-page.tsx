"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Link2, Unlink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { JenisTransaksi, Surat, SuratCollectionItem } from "@/lib/types";

const schema = z.object({
  nama_jenistransaksi: z.string().min(1, "Nama jenis transaksi wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

export default function JenisTransaksiPage() {
  const [items, setItems] = useState<(JenisTransaksi & { surat_count: number })[]>([]);
  const [suratList, setSuratList] = useState<Surat[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JenisTransaksi | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JenisTransaksi | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [assignTarget, setAssignTarget] = useState<JenisTransaksi | null>(null);
  const [collection, setCollection] = useState<SuratCollectionItem[]>([]);
  const [selectedSurat, setSelectedSurat] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nama_jenistransaksi: "" },
  });

  const load = () => {
    api.listJenistransaksi().then(setItems);
    api.listSurat().then(setSuratList);
  };

  useEffect(load, []);

  const loadCollection = (jenisId: number) => {
    api.getSuratCollection(jenisId).then(setCollection);
  };

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ nama_jenistransaksi: "" });
    setOpen(true);
  };

  const handleOpenEdit = (r: JenisTransaksi) => {
    setEditing(r);
    reset({ nama_jenistransaksi: r.nama_jenistransaksi });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      if (editing) {
        await api.updateJenistransaksi(editing.id, values.nama_jenistransaksi);
        toast.success("Jenis transaksi diperbarui");
      } else {
        await api.createJenistransaksi(values.nama_jenistransaksi);
        toast.success("Jenis transaksi ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan jenis transaksi");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteJenistransaksi(deleteTarget.id);
      toast.success("Jenis transaksi dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus jenis transaksi");
    } finally {
      setDeleting(false);
    }
  };

  const handleAssign = async () => {
    if (!assignTarget || !selectedSurat) {
      toast.error("Pilih surat terlebih dahulu");
      return;
    }
    try {
      await api.assignSurat(assignTarget.id, selectedSurat, {
        urutan: collection.length + 1,
      });
      toast.success("Surat ditautkan");
      setSelectedSurat("");
      loadCollection(assignTarget.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menautkan surat");
    }
  };

  const handleUnassign = async (suratId: string) => {
    if (!assignTarget) return;
    try {
      await api.removeSurat(assignTarget.id, suratId);
      toast.success("Surat dilepas");
      loadCollection(assignTarget.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal melepas surat");
    }
  };

  const openAssign = (r: JenisTransaksi) => {
    setAssignTarget(r);
    setSelectedSurat("");
    loadCollection(r.id);
  };

  return (
    <div>
      <PageHeader
        title="Jenis Transaksi"
        description="Kelola jenis transaksi dan surat yang terkait."
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Jenis Transaksi
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((j) => (
          <Card key={j.id} className="border shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-[15px]">{j.nama_jenistransaksi}</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => handleOpenEdit(j)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(j)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{j.surat_count} surat terhubung</Badge>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => openAssign(j)}
              >
                <Link2 className="size-3.5" /> Atur Surat
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CRUD dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Jenis Transaksi" : "Tambah Jenis Transaksi"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Jenis Transaksi *</Label>
              <Input
                placeholder="Jual Beli, Hibah, dll"
                {...register("nama_jenistransaksi")}
                aria-invalid={!!errors.nama_jenistransaksi}
              />
              {errors.nama_jenistransaksi && (
                <p className="text-[11.5px] text-destructive">{errors.nama_jenistransaksi.message}</p>
              )}
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

      {/* Assign dialog */}
      <Dialog open={assignTarget !== null} onOpenChange={(o) => !o && setAssignTarget(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Atur Surat — {assignTarget?.nama_jenistransaksi}</DialogTitle>
            <DialogDescription>
              Tautkan surat yang akan muncul saat membuat transaksi jenis ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Select value={selectedSurat} onValueChange={setSelectedSurat}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih surat" />
                </SelectTrigger>
                <SelectContent>
                  {suratList
                    .filter((s) => !collection.some((c) => c.id === s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nama_surat}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign}>
                <Link2 className="size-4" /> Tautkan
              </Button>
            </div>

            <div className="space-y-2">
              {collection.length === 0 && (
                <p className="py-6 text-center text-[12.5px] text-muted-foreground">
                  Belum ada surat terhubung.
                </p>
              )}
              {collection.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{c.nama_surat}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {c.jenis_surat} · Template: {c.template?.name ?? "-"}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-destructive"
                    onClick={() => handleUnassign(c.id)}
                  >
                    <Unlink className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus jenis transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{deleteTarget?.nama_jenistransaksi}</span>{" "}
              dan seluruh relasi suratnya akan dihapus.
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
