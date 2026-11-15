"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { TemplateCategory } from "@/lib/types";

const schema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
  code: z.string().max(30, "Kode maksimal 30 karakter"),
  description: z.string(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export default function KategoriPage() {
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateCategory | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", description: "", sort_order: 0, is_active: true },
  });

  const load = () => api.listCategories().then(setCategories);
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", code: "", description: "", sort_order: categories.length + 1, is_active: true });
    setOpen(true);
  };

  const openEdit = (category: TemplateCategory) => {
    setEditing(category);
    reset(category);
    setOpen(true);
  };

  const save = handleSubmit(async (values) => {
    try {
      if (editing) {
        await api.updateCategory(editing.id, values);
        toast.success("Kategori diperbarui");
      } else {
        await api.createCategory(values);
        toast.success("Kategori ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan kategori");
    }
  });

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCategory(deleteTarget.id);
      toast.success("Kategori dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus kategori");
    }
  };

  return (
    <div>
      <PageHeader title="Kategori Template" description="Kelompokkan template berdasarkan jenis dokumen.">
        <Button onClick={openCreate}><Plus className="size-4" /> Tambah Kategori</Button>
      </PageHeader>

      {categories.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Belum ada kategori" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="border shadow-none">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderKanban className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{c.name}</p><StatusBadge status={c.is_active ? "active" : "inactive"} /></div>
                  <p className="font-mono text-[11px] text-muted-foreground">{c.code} · Urutan {c.sort_order}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">{c.description || "-"}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Switch checked={c.is_active} onCheckedChange={async (v) => { await api.updateCategory(c.id, { ...c, is_active: v }); load(); }} /><span className="text-[11.5px] text-muted-foreground">{c.is_active ? "Aktif" : "Nonaktif"}</span></div>
                    <div className="flex gap-1"><Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(c)}><Pencil className="size-4" /></Button><Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setDeleteTarget(c)}><Trash2 className="size-4" /></Button></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle><DialogDescription>Kelola metadata kategori template.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nama *</Label><Input {...register("name")} aria-invalid={!!errors.name} />{errors.name && <p className="text-[11.5px] text-destructive">{errors.name.message}</p>}</div>
            <div className="space-y-1.5"><Label>Kode</Label><Input {...register("code")} placeholder="AKTA" /></div>
            <div className="space-y-1.5"><Label>Urutan</Label><Input type="number" {...register("sort_order")} /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Textarea rows={3} {...register("description")} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register("is_active")} className="size-4" /> Aktif</label>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}><AlertDialogContent className="sm:max-w-md"><AlertDialogHeader><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0"><AlertTriangle className="size-6" /></div><AlertDialogTitle>Hapus kategori?</AlertDialogTitle><AlertDialogDescription>Kategori <span className="font-semibold text-foreground">{deleteTarget?.name}</span> akan dihapus.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); remove(); }} className={buttonVariants({ variant: "destructive" })}>Ya, Hapus</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
