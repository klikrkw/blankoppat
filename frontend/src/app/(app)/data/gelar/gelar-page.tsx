"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
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
import type { Gelar } from "@/lib/types";

const schema = z.object({
  singkatan: z.string().min(1, "Singkatan gelar wajib diisi"),
  kepanjangan: z.string().min(1, "Kepanjangan gelar wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = { singkatan: "", kepanjangan: "" };

export default function GelarPage() {
  const [items, setItems] = useState<Gelar[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Gelar | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Gelar | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyForm,
  });

  const load = () => {
    api.listGelar(search, page, pageSize).then((r) => {
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

  const handleOpenEdit = (r: Gelar) => {
    setEditing(r);
    reset({ singkatan: r.singkatan, kepanjangan: r.kepanjangan });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    const payload = {
      singkatan: values.singkatan.trim(),
      kepanjangan: values.kepanjangan.trim(),
    };
    try {
      if (editing) {
        await api.updateGelar(editing.id, payload);
        toast.success("Gelar diperbarui");
      } else {
        await api.createGelar(payload);
        toast.success("Gelar ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan gelar");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteGelar(deleteTarget.id);
      toast.success("Gelar dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus gelar");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Gelar>[] = [
    {
      key: "singkatan",
      label: "Singkatan",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <GraduationCap className="size-4" />
          </span>
          <Badge variant="secondary" className="font-mono text-[12px]">
            {r.singkatan}
          </Badge>
        </div>
      ),
    },
    {
      key: "kepanjangan",
      label: "Kepanjangan",
      render: (r) => <span className="font-medium">{r.kepanjangan}</span>,
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
        title="Gelar"
        description="Kelola master gelar beserta singkatan dan kepanjangannya."
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Gelar
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
          placeholder="Cari singkatan atau kepanjangan..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Gelar tidak ditemukan" />

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Gelar" : "Tambah Gelar"}</DialogTitle>
            <DialogDescription>
              Masukkan singkatan dan kepanjangan gelar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Singkatan *</Label>
              <Input
                placeholder="Contoh: S.H."
                {...register("singkatan")}
                aria-invalid={!!errors.singkatan}
              />
              {errors.singkatan && (
                <p className="text-[11.5px] text-destructive">{errors.singkatan.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Kepanjangan *</Label>
              <Input
                placeholder="Contoh: Sarjana Hukum"
                {...register("kepanjangan")}
                aria-invalid={!!errors.kepanjangan}
              />
              {errors.kepanjangan && (
                <p className="text-[11.5px] text-destructive">{errors.kepanjangan.message}</p>
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
            <AlertDialogTitle className="pt-2">Hapus gelar?</AlertDialogTitle>
            <AlertDialogDescription>
              Gelar{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.singkatan}
              </span>{" "}
              ({deleteTarget?.kepanjangan}) akan dihapus permanen.
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
