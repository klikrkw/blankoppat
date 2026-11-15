"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Boxes, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import type { Item } from "@/lib/types";

const schema = z.object({
  nama_item: z.string().min(1, "Nama item wajib diisi"),
  keterangan: z.string(),
});

type FormValues = z.infer<typeof schema>;

const emptyForm: FormValues = { nama_item: "", keterangan: "" };

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
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
    api.listItems(search, page, pageSize).then((r) => {
      setItems(r.data);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, page]);

  const checkName = async (value: string, excludeId?: number): Promise<boolean> => {
    const name = value.trim();
    if (!name) return false;
    try {
      const exists = await api.checkItemName(name, excludeId);
      if (exists) {
        setError("nama_item", { type: "manual", message: "Nama item sudah digunakan" });
      } else {
        clearErrors("nama_item");
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

  const handleOpenEdit = (r: Item) => {
    setEditing(r);
    reset({ nama_item: r.nama_item, keterangan: r.keterangan ?? "" });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    if (await checkName(values.nama_item, editing?.id)) {
      toast.error("Nama item sudah digunakan");
      return;
    }
    try {
      if (editing) {
        await api.updateItem(editing.id, {
          nama_item: values.nama_item.trim(),
          keterangan: values.keterangan,
        });
        toast.success("Item diperbarui");
      } else {
        await api.createItem({
          nama_item: values.nama_item.trim(),
          keterangan: values.keterangan,
        });
        toast.success("Item ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan item");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteItem(deleteTarget.id);
      toast.success("Item dihapus");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus item");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Item>[] = [
    {
      key: "nama_item",
      label: "Nama Item",
      render: (r) => (
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Boxes className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{r.nama_item}</p>
            <p className="line-clamp-2 text-[11.5px] text-muted-foreground">
              {r.keterangan?.trim() || "-"}
            </p>
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
      <PageHeader title="Items" description="Kelola master item untuk section dokumen.">
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Item
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
          placeholder="Cari item..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Item tidak ditemukan" />

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
            <DialogTitle>{editing ? "Edit Item" : "Tambah Item"}</DialogTitle>
            <DialogDescription>Masukkan nama item dan keterangan.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Item *</Label>
              <Input
                placeholder="Contoh: Luas Tanah"
                {...register("nama_item")}
                onBlur={(e) => checkName(e.target.value, editing?.id)}
                aria-invalid={!!errors.nama_item}
              />
              {errors.nama_item ? (
                <p className="text-[11.5px] text-destructive">{errors.nama_item.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Nama item harus unik (tidak boleh sama).
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Input placeholder="Opsional" {...register("keterangan")} />
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
            <AlertDialogTitle className="pt-2">Hapus item?</AlertDialogTitle>
            <AlertDialogDescription>
              Item <span className="font-semibold text-foreground">{deleteTarget?.nama_item}</span>{" "}
              akan dihapus. Item yang masih dipakai section transaksi tidak dapat dihapus.
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
