"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, BookMarked, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Edisi } from "@/lib/types";

const schema = z.object({
  nama_edisi: z.string().min(1, "Nama edisi wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

export default function EdisiPage() {
  const [items, setItems] = useState<Edisi[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Edisi | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Edisi | null>(null);
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
    defaultValues: { nama_edisi: "" },
  });

  const load = () => {
    api.listEdisi(search, page, pageSize).then((r) => {
      setItems(r.data);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  const checkName = async (value: string, excludeId?: number): Promise<boolean> => {
    const name = value.trim();
    if (!name) return false;
    try {
      const exists = await api.checkEdisiName(name, excludeId);
      if (exists) {
        setError("nama_edisi", { type: "manual", message: "Nama edisi sudah digunakan" });
      } else {
        clearErrors("nama_edisi");
      }
      return exists;
    } catch {
      return false;
    }
  };

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ nama_edisi: "" });
    setOpen(true);
  };

  const handleOpenEdit = (r: Edisi) => {
    setEditing(r);
    reset({ nama_edisi: r.nama_edisi });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    if (await checkName(values.nama_edisi, editing?.id)) {
      toast.error("Nama edisi sudah digunakan");
      return;
    }
    try {
      if (editing) {
        await api.updateEdisi(editing.id, values.nama_edisi.trim());
        toast.success("Edisi diperbarui");
      } else {
        await api.createEdisi(values.nama_edisi.trim());
        toast.success("Edisi ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan edisi");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteEdisi(deleteTarget.id);
      toast.success("Edisi dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus edisi");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Edisi>[] = [
    {
      key: "nama_edisi",
      label: "Nama Edisi",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookMarked className="size-4" />
          </span>
          <span className="font-medium">{r.nama_edisi}</span>
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
      <PageHeader title="Edisi" description="Kelola master data edisi objek tanah.">
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Edisi
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
          placeholder="Cari edisi..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Edisi tidak ditemukan" />

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Edisi" : "Tambah Edisi"}</DialogTitle>
            <DialogDescription>Masukkan nama edisi.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Edisi *</Label>
              <Input
                placeholder="Contoh: Edisi 1 Waris"
                {...register("nama_edisi")}
                onBlur={(e) => checkName(e.target.value, editing?.id)}
                aria-invalid={!!errors.nama_edisi}
              />
              {errors.nama_edisi ? (
                <p className="text-[11.5px] text-destructive">{errors.nama_edisi.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Nama edisi harus unik (tidak boleh sama).
                </p>
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus edisi?</AlertDialogTitle>
            <AlertDialogDescription>
              Edisi{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.nama_edisi}</span>{" "}
              akan dihapus. Edisi yang masih dipakai objek tanah tidak dapat dihapus.
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
