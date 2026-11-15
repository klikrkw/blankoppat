"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Briefcase, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import type { Job } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Nama job wajib diisi"),
  description: z.string(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = { name: "", description: "" };

export default function JobsPage() {
  const [items, setItems] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Job | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Job | null>(null);
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

  const load = () => {
    api.listJobs(search, page, pageSize).then((r) => {
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
      const exists = await api.checkJobName(name, excludeId);
      if (exists) {
        setError("name", { type: "manual", message: "Nama job sudah digunakan" });
      } else {
        clearErrors("name");
      }
      return exists;
    } catch {
      return false;
    }
  };

  const handleOpenCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (row: Job) => {
    setEditing(row);
    reset({ name: row.name, description: row.description ?? "" });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    if (await checkName(values.name, editing?.id)) {
      toast.error("Nama job sudah digunakan");
      return;
    }
    try {
      if (editing) {
        await api.updateJob(editing.id, {
          name: values.name.trim(),
          description: values.description,
        });
        toast.success("Job diperbarui");
      } else {
        await api.createJob({
          name: values.name.trim(),
          description: values.description,
        });
        toast.success("Job ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan job");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteJob(deleteTarget.id);
      toast.success("Job dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus job");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Job>[] = [
    {
      key: "name",
      label: "Nama Job",
      render: (row) => (
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.name}</p>
            <p className="line-clamp-2 text-[11.5px] text-muted-foreground">
              {row.description || "-"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "staff_count",
      label: "Staff",
      render: (row) => <Badge variant="outline">{row.staff_count ?? 0} staff</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => handleOpenEdit(row)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive"
            onClick={() => setDeleteTarget(row)}
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
      <PageHeader
        title="Jobs"
        description="Daftar job/jabatan untuk data staff dan pemanggilan di template."
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Job
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
          placeholder="Cari nama atau deskripsi job..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Job tidak ditemukan" />

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
            <DialogTitle>{editing ? "Edit Job" : "Tambah Job"}</DialogTitle>
            <DialogDescription>
              Job dipakai untuk mengelompokkan staff dan dipanggil di template lewat{" "}
              {`{{staff('Nama Job')}}`}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Job *</Label>
              <Input
                placeholder="Contoh: PPAT"
                {...register("name")}
                onBlur={(e) => checkName(e.target.value, editing?.id)}
                aria-invalid={!!errors.name}
              />
              {errors.name ? (
                <p className="text-[11.5px] text-destructive">{errors.name.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Nama job harus unik (tidak boleh sama).
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                rows={3}
                placeholder="Opsional"
                {...register("description")}
              />
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
            <AlertDialogTitle className="pt-2">Hapus job?</AlertDialogTitle>
            <AlertDialogDescription>
              Job <span className="font-semibold text-foreground">{deleteTarget?.name}</span> akan
              dihapus. Job yang masih dipakai staff tidak dapat dihapus.
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
