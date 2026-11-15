"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ScrollText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Surat, Template } from "@/lib/types";

type SuratRow = Surat & { template?: { id: number; name: string; version: number; status: string } };

const suratSchema = z.object({
  jenis_surat: z.string().min(1, "Jenis surat wajib diisi"),
  nama_surat: z.string().min(1, "Nama surat wajib diisi"),
  keterangan: z.string(),
  template_id: z.string(),
});

type SuratForm = z.infer<typeof suratSchema>;

const emptyForm: SuratForm = {
  jenis_surat: "AKTA",
  nama_surat: "",
  keterangan: "",
  template_id: "",
};

export default function SuratPage() {
  const [items, setItems] = useState<SuratRow[]>([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [templates, setTemplates] = useState<Template[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SuratRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SuratRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SuratForm>({
    resolver: zodResolver(suratSchema),
    defaultValues: emptyForm,
  });

  const load = () => {
    api.listSurat().then(setItems);
    api.listTemplates().then((t) => setTemplates(t));
  };

  useEffect(load, []);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paged = items.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      const id = setTimeout(() => setPage(totalPages), 0);
      return () => clearTimeout(id);
    }
  }, [page, totalPages]);

  const handleOpenCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (r: SuratRow) => {
    setEditing(r);
    reset({
      jenis_surat: r.jenis_surat,
      nama_surat: r.nama_surat,
      keterangan: r.keterangan,
      template_id: r.template_id ? String(r.template_id) : "",
    });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    const payload = {
      jenis_surat: values.jenis_surat,
      nama_surat: values.nama_surat,
      keterangan: values.keterangan,
      template_id: values.template_id ? Number(values.template_id) : null,
    };
    try {
      if (editing) {
        await api.updateSurat(editing.id, payload);
        toast.success("Surat diperbarui");
      } else {
        await api.createSurat(payload);
        toast.success("Surat ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan surat");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSurat(deleteTarget.id);
      toast.success("Surat dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus surat");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<SuratRow>[] = [
    {
      key: "nama_surat",
      label: "Surat",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ScrollText className="size-4" />
          </span>
          <div>
            <p className="font-medium">{r.nama_surat}</p>
            <p className="text-[11.5px] text-muted-foreground">{r.keterangan || "-"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "jenis_surat",
      label: "Jenis",
      render: (r) => <Badge variant="secondary">{r.jenis_surat}</Badge>,
    },
    {
      key: "template",
      label: "Template",
      hideMobile: true,
      render: (r) =>
        r.template ? (
          <span className="text-[12.5px]">
            {r.template.name} <span className="text-muted-foreground">(v{r.template.version})</span>
          </span>
        ) : (
          <span className="text-[12.5px] text-destructive">Belum ada template</span>
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
        title="Kelola Surat"
        description="Hubungkan template dengan jenis surat yang digunakan pada transaksi."
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Surat
        </Button>
      </PageHeader>

      <DataGrid items={paged} columns={columns} emptyTitle="Belum ada surat" />

      <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted-foreground">
        <span>
          Menampilkan {items.length === 0 ? 0 : (page - 1) * pageSize + 1}–
          {Math.min(page * pageSize, items.length)} dari {items.length}
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
            <DialogTitle>{editing ? "Edit Surat" : "Tambah Surat"}</DialogTitle>
            <DialogDescription>
              Surat memakai template untuk generate dokumen saat transaksi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Surat *</Label>
              <Input placeholder="Akta Jual Beli" {...register("nama_surat")} aria-invalid={!!errors.nama_surat} />
              {errors.nama_surat && (
                <p className="text-[11.5px] text-destructive">{errors.nama_surat.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Surat *</Label>
              <Controller
                control={control}
                name="jenis_surat"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AKTA">AKTA</SelectItem>
                      <SelectItem value="SURAT KUASA">SURAT KUASA</SelectItem>
                      <SelectItem value="SURAT PERNYATAAN">SURAT PERNYATAAN</SelectItem>
                      <SelectItem value="PERJANJIAN">PERJANJIAN</SelectItem>
                      <SelectItem value="TANDA TERIMA">TANDA TERIMA</SelectItem>
                      <SelectItem value="LAINNYA">LAINNYA</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.jenis_surat && (
                <p className="text-[11.5px] text-destructive">{errors.jenis_surat.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Controller
                control={control}
                name="template_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tanpa template</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name} (v{t.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Keterangan</Label>
              <Textarea rows={2} placeholder="Keterangan singkat" {...register("keterangan")} />
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
            <AlertDialogTitle className="pt-2">Hapus surat?</AlertDialogTitle>
            <AlertDialogDescription>
              Surat <span className="font-semibold text-foreground">{deleteTarget?.nama_surat}</span>{" "}
              akan dihapus dari semua jenis transaksi.
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
