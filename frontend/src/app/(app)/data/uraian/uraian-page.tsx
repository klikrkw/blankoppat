"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataGrid, type Column } from "@/components/data-grid";
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
import type { Uraian } from "@/lib/types";

const schema = z.object({
  nama_uraian: z.string().min(1, "Nama uraian wajib diisi"),
  isi_uraian: z.string(),
  isi_singkat: z.string(),
  parameters: z.string(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = { nama_uraian: "", isi_uraian: "", isi_singkat: "", parameters: "" };

export default function UraianPage() {
  const [items, setItems] = useState<Uraian[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Uraian | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Uraian | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });

  const checkName = async (value: string, excludeId?: number): Promise<boolean> => {
    const name = value.trim();
    if (!name) return false;
    try {
      const exists = await api.checkUraianName(name, excludeId);
      if (exists) {
        setError("nama_uraian", { type: "manual", message: "Nama uraian sudah digunakan" });
      } else {
        clearErrors("nama_uraian");
      }
      return exists;
    } catch {
      return false;
    }
  };

  const load = () => {
    api.listUraian(search, page, pageSize).then((r) => {
      setItems(r.data);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const handleOpenCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (r: Uraian) => {
    setEditing(r);
    reset({
      nama_uraian: r.nama_uraian,
      isi_uraian: r.isi_uraian ?? "",
      isi_singkat: r.isi_singkat ?? "",
      parameters: (r.parameters ?? []).join(", "),
    });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    const payload = {
      nama_uraian: values.nama_uraian.trim(),
      isi_uraian: values.isi_uraian,
      isi_singkat: values.isi_singkat,
      parameters: values.parameters
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
    };
    if (await checkName(values.nama_uraian, editing?.id)) {
      toast.error("Nama uraian sudah digunakan");
      return;
    }
    try {
      if (editing) {
        await api.updateUraian(editing.id, payload);
        toast.success("Uraian diperbarui");
      } else {
        await api.createUraian(payload);
        toast.success("Uraian ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan uraian");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteUraian(deleteTarget.id);
      toast.success("Uraian dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus uraian");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Uraian>[] = [
    {
      key: "nama_uraian",
      label: "Nama Uraian",
      render: (r) => (
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{r.nama_uraian}</p>
            <p className="line-clamp-2 text-[11.5px] text-muted-foreground">
              {r.isi_uraian?.trim() || "-"}
            </p>
            {r.isi_singkat?.trim() && (
              <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                <span className="font-medium">Singkat:</span> {r.isi_singkat}
              </p>
            )}
            {(r.parameters ?? []).length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {(r.parameters ?? []).map((param) => (
                  <span
                    key={param}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground"
                  >
                    {`{{${param}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader title="Uraian" description="Kelola master uraian teks untuk dokumen.">
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Uraian
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
          placeholder="Cari nama atau isi uraian..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Uraian tidak ditemukan" />

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
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Uraian" : "Tambah Uraian"}</DialogTitle>
            <DialogDescription>Masukkan nama dan isi uraian.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Uraian *</Label>
              <Input
                placeholder="Contoh: Uraian Jual Beli"
                {...register("nama_uraian")}
                onBlur={(e) => checkName(e.target.value, editing?.id)}
                aria-invalid={!!errors.nama_uraian}
              />
              {errors.nama_uraian ? (
                <p className="text-[11.5px] text-destructive">{errors.nama_uraian.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Nama uraian harus unik (tidak boleh sama).
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Parameter (pisah koma)</Label>
              <Input
                placeholder="Contoh: nama, nik, desa"
                {...register("parameters")}
              />
              <p className="text-[11px] text-muted-foreground">
                Opsional. Di isi uraian, parameter dipakai sebagai {"{{nama}}"} atau {"$1"}.
                Panggil di template: {"{{uraian('Nama Uraian', nilai1, nilai2)}}"}.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Isi Uraian</Label>
              <Textarea
                rows={10}
                placeholder="Tulis isi uraian lengkap..."
                className="text-[12.5px] leading-relaxed"
                {...register("isi_uraian")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Isi Singkat</Label>
              <Textarea
                rows={4}
                placeholder="Versi ringkas, mis. {{nama}} ({{desa}})"
                className="text-[12.5px] leading-relaxed"
                {...register("isi_singkat")}
              />
              <p className="text-[11px] text-muted-foreground">
                Opsional. Dipakai lewat {"{{uraian_singkat('Nama Uraian', nilai1, nilai2)}}"}.
                Parameter yang sama ({`{{nama}}`} atau {"$1"}) berlaku untuk isi lengkap dan isi
                singkat. Bila dikosongkan, template memakai isi lengkap.
              </p>
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
            <AlertDialogTitle className="pt-2">Hapus uraian?</AlertDialogTitle>
            <AlertDialogDescription>
              Uraian{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.nama_uraian}</span>{" "}
              akan dihapus permanen.
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
