"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users, AlertTriangle } from "lucide-react";
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
import { StatusBadge } from "@/components/status-badge";
import {
  Dialog,
  DialogContent,
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
import type { PihakRoleItem } from "@/lib/types";

const schema = z.object({
  role: z.string().min(1, "Peran wajib diisi"),
  sebutan: z.string().min(1, "Sebutan wajib diisi"),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = { role: "", sebutan: "", is_active: true };

export default function PihakRolesPage() {
  const [items, setItems] = useState<PihakRoleItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PihakRoleItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PihakRoleItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyForm });

  const load = () => api.listPihakRoles().then(setItems);
  useEffect(() => {
    load();
  }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (r: PihakRoleItem) => {
    setEditing(r);
    reset({ role: r.role, sebutan: r.sebutan, is_active: r.is_active });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      if (editing) {
        await api.updatePihakRole(editing.id, values);
        toast.success("Peran pihak diperbarui");
      } else {
        await api.createPihakRole(values);
        toast.success("Peran pihak ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan peran pihak");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePihakRole(deleteTarget.id);
      toast.success("Peran pihak dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus peran pihak");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<PihakRoleItem>[] = [
    {
      key: "role",
      label: "Peran",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="size-4" />
          </span>
          <span className="font-medium">{r.role}</span>
        </div>
      ),
    },
    {
      key: "sebutan",
      label: "Sebutan",
      render: (r) => <Badge variant="secondary">{r.sebutan}</Badge>,
    },
    {
      key: "is_active",
      label: "Status",
      render: (r) => <StatusBadge status={r.is_active ? "active" : "inactive"} />,
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
      <PageHeader title="Peran Pihak" description="Kelola master peran pihak dalam transaksi.">
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Peran
        </Button>
      </PageHeader>

      <DataGrid items={items} columns={columns} emptyTitle="Belum ada peran pihak" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Peran Pihak" : "Tambah Peran Pihak"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Peran *</Label>
              <Input placeholder="PENJUAL" {...register("role")} aria-invalid={!!errors.role} />
              {errors.role && <p className="text-[11.5px] text-destructive">{errors.role.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Sebutan *</Label>
              <Input placeholder="PIHAK PERTAMA" {...register("sebutan")} aria-invalid={!!errors.sebutan} />
              {errors.sebutan && <p className="text-[11.5px] text-destructive">{errors.sebutan.message}</p>}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register("is_active")} className="size-4" />
              Aktif
            </label>
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
            <AlertDialogTitle className="pt-2">Hapus peran pihak?</AlertDialogTitle>
            <AlertDialogDescription>
              Peran <span className="font-semibold text-foreground">{deleteTarget?.role}</span> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
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
