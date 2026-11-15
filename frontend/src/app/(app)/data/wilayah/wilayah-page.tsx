"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Wilayah } from "@/lib/types";
import { ProvinsiSelect } from "@/components/provinsi-select";
import { KabupatenSelect } from "@/components/kabupaten-select";
import { KecamatanSelect } from "@/components/kecamatan-select";
import { DesaSelect } from "@/components/desa-select";

const wilayahSchema = z.object({
  kode_wilayah: z.string().min(1, "Kode wilayah wajib diisi"),
  desa: z.string().min(1, "Desa wajib diisi"),
  tipe_desa: z.enum(["Desa", "Kelurahan"]),
  kecamatan: z.string().min(1, "Kecamatan wajib diisi"),
  kabupaten: z.string().min(1, "Kabupaten wajib diisi"),
  tipe_kabupaten: z.enum(["Kabupaten", "Kota"]),
  provinsi: z.string().min(1, "Provinsi wajib diisi"),
});

type WilayahForm = z.infer<typeof wilayahSchema>;

const emptyForm: WilayahForm = {
  kode_wilayah: "",
  desa: "",
  tipe_desa: "Desa",
  kecamatan: "",
  kabupaten: "",
  tipe_kabupaten: "Kabupaten",
  provinsi: "",
};

export default function WilayahPage() {
  const [items, setItems] = useState<Wilayah[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wilayah | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Wilayah | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [provinceCode, setProvinceCode] = useState("");
  const [regencyCode, setRegencyCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WilayahForm>({
    resolver: zodResolver(wilayahSchema),
    defaultValues: emptyForm,
  });

  const load = () => {
    api.listWilayah(search, page, pageSize).then((r) => {
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
    setProvinceCode("");
    setRegencyCode("");
    setDistrictCode("");
    reset(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (r: Wilayah) => {
    setEditing(r);
    setProvinceCode(r.kode_wilayah.slice(0, 2));
    setRegencyCode(r.kode_wilayah.slice(0, 4));
    setDistrictCode(r.kode_wilayah.slice(0, 6));
    reset({
      kode_wilayah: r.kode_wilayah,
      desa: r.desa,
      tipe_desa: r.tipe_desa ?? "Desa",
      kecamatan: r.kecamatan,
      kabupaten: r.kabupaten,
      tipe_kabupaten: r.tipe_kabupaten ?? "Kabupaten",
      provinsi: r.provinsi,
    });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      if (editing) {
        await api.updateWilayah(editing.id, values);
        toast.success("Wilayah diperbarui");
      } else {
        await api.createWilayah(values);
        toast.success("Wilayah ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan wilayah");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteWilayah(deleteTarget.id);
      toast.success("Wilayah dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus wilayah");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Wilayah>[] = [
    {
      key: "kode_wilayah",
      label: "Kode",
      render: (r) => <Badge variant="secondary" className="font-mono">{r.kode_wilayah}</Badge>,
    },
    {
      key: "desa",
      label: "Desa / Kelurahan",
      render: (r) => (
        <div>
          <span className="font-medium">{r.desa}</span>
          <Badge variant="outline" className="ml-2 text-[10px]">{r.tipe_desa}</Badge>
        </div>
      ),
    },
    {
      key: "kecamatan",
      label: "Kecamatan",
      hideMobile: true,
      render: (r) => r.kecamatan,
    },
    {
      key: "kabupaten",
      label: "Kabupaten / Kota",
      hideMobile: true,
      render: (r) => (
        <div>
          <span>{r.kabupaten}</span>
          <Badge variant="secondary" className="ml-2 text-[10px]">{r.tipe_kabupaten}</Badge>
        </div>
      ),
    },
    {
      key: "provinsi",
      label: "Provinsi",
      hideMobile: true,
      render: (r) => <Badge variant="outline">{r.provinsi}</Badge>,
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
      <PageHeader title="Wilayah" description="Kelola data wilayah administrasi (desa — provinsi).">
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Wilayah
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
          placeholder="Cari desa, kecamatan, kabupaten..."
          className="pl-9"
        />
      </div>

      <DataGrid
        items={items}
        columns={columns}
        emptyTitle="Wilayah tidak ditemukan"
        emptyDescription="Tambahkan data wilayah baru atau coba kata kunci lain."
      />

      <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted-foreground">
        <span>
          Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} dari {total}
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Sebelumnya
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Berikutnya
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Wilayah" : "Tambah Wilayah"}</DialogTitle>
            <DialogDescription>Masukkan data wilayah administrasi.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Provinsi *</Label>
              <Controller
                control={control}
                name="provinsi"
                render={({ field }) => (
                  <ProvinsiSelect
                    value={field.value}
                    onChange={(p) => {
                      field.onChange(p.name);
                      setProvinceCode(p.code);
                      setRegencyCode("");
                      setValue("kode_wilayah", p.code, { shouldValidate: true });
                      setValue("kabupaten", "");
                      setValue("kecamatan", "");
                      setValue("desa", "");
                    }}
                  />
                )}
              />
              {errors.provinsi && (
                <p className="text-[11.5px] text-destructive">{errors.provinsi.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Kabupaten / Kota *</Label>
              <Controller
                control={control}
                name="kabupaten"
                render={({ field }) => (
                  <KabupatenSelect
                    provinceCode={provinceCode}
                    value={field.value}
                    onChange={(item) => {
                      field.onChange(item.name);
                      setRegencyCode(String(item.code));
                      setValue("kode_wilayah", String(item.code), { shouldValidate: true });
                      setValue("kecamatan", "");
                      setValue("desa", "");
                      setValue(
                        "tipe_kabupaten",
                        /\bkota\b/i.test(item.name) ? "Kota" : "Kabupaten",
                        { shouldValidate: true }
                      );
                    }}
                  />
                )}
              />
              {errors.kabupaten && (
                <p className="text-[11.5px] text-destructive">{errors.kabupaten.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tipe Kabupaten</Label>
              <Controller
                control={control}
                name="tipe_kabupaten"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kabupaten">Kabupaten</SelectItem>
                      <SelectItem value="Kota">Kota</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kecamatan *</Label>
              <Controller
                control={control}
                name="kecamatan"
                render={({ field }) => (
                  <KecamatanSelect
                    regencyCode={regencyCode}
                    value={field.value}
                    onChange={(item) => {
                      field.onChange(item.name);
                      setDistrictCode(String(item.code));
                      setValue("kode_wilayah", String(item.code), { shouldValidate: true });
                      setValue("desa", "");
                    }}
                  />
                )}
              />
              {errors.kecamatan && (
                <p className="text-[11.5px] text-destructive">{errors.kecamatan.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Desa / Kelurahan *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="desa"
                    render={({ field }) => (
                      <DesaSelect
                        districtCode={districtCode}
                        value={field.value}
                        onChange={(item) => {
                          field.onChange(item.name);
                          setValue("kode_wilayah", String(item.code), { shouldValidate: true });
                        }}
                      />
                    )}
                  />
                </div>
                <Controller
                  control={control}
                  name="tipe_desa"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-32 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Desa">Desa</SelectItem>
                        <SelectItem value="Kelurahan">Kelurahan</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {errors.desa && <p className="text-[11.5px] text-destructive">{errors.desa.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Kode Wilayah *</Label>
              <Input
                placeholder="3515102003"
                readOnly
                className="bg-muted/50"
                {...register("kode_wilayah")}
                aria-invalid={!!errors.kode_wilayah}
              />
              <p className="text-[11px] text-muted-foreground">
                Terisi otomatis dari desa/kelurahan yang dipilih.
              </p>
              {errors.kode_wilayah && (
                <p className="text-[11.5px] text-destructive">{errors.kode_wilayah.message}</p>
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
            <AlertDialogTitle className="pt-2">Hapus wilayah?</AlertDialogTitle>
            <AlertDialogDescription>
              Wilayah <span className="font-semibold text-foreground">{deleteTarget?.desa}</span>,{" "}
              {deleteTarget?.kecamatan}, {deleteTarget?.kabupaten} akan dihapus permanen.
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
