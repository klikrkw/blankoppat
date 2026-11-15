"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Pencil, Trash2, AlertTriangle, Upload, Loader2 } from "lucide-react";
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
import { formatDateID } from "@/lib/format";
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
import type { EktpRecord, Wilayah } from "@/lib/types";
import { WilayahSelect } from "@/components/wilayah-select";
import { PekerjaanSelect } from "@/components/pekerjaan-select";

const ektpSchema = z.object({
  nik: z
    .string()
    .min(16, "NIK harus 16 digit")
    .max(16, "NIK harus 16 digit")
    .regex(/^\d+$/, "NIK hanya boleh berisi angka"),
  nama: z.string().min(1, "Nama wajib diisi"),
  tempat_lahir: z.string().min(1, "Tempat lahir wajib diisi"),
  tanggal_lahir: z.string().min(1, "Tanggal lahir wajib diisi"),
  jenis_kelamin: z.enum(["LAKI-LAKI", "PEREMPUAN"]),
  alamat: z.string().min(1, "Alamat wajib diisi"),
  rt: z.string(),
  rw: z.string(),
  wilayah_id: z.number().nullable(),
  agama: z.string(),
  status_perkawinan: z.enum(["BELUM KAWIN", "KAWIN", "CERAI HIDUP", "CERAI MATI"]),
  pekerjaan: z.string(),
  kewarganegaraan: z.string(),
});

type EktpForm = z.infer<typeof ektpSchema>;

const emptyForm: EktpForm = {
  nik: "",
  nama: "",
  tempat_lahir: "",
  tanggal_lahir: "",
  jenis_kelamin: "LAKI-LAKI",
  alamat: "",
  rt: "",
  rw: "",
  wilayah_id: null,
  agama: "ISLAM",
  status_perkawinan: "BELUM KAWIN",
  pekerjaan: "",
  kewarganegaraan: "WNI",
};

export default function EktpPage() {
  const [items, setItems] = useState<EktpRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EktpRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EktpRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<EktpForm>({
    resolver: zodResolver(ektpSchema),
    defaultValues: emptyForm,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- RHF watch() tidak dapat dimemoize React Compiler
  const nikValue = watch("nik");

  useEffect(() => {
    if (!open || nikValue?.length !== 16 || !/^\d{16}$/.test(nikValue)) {
      clearErrors("nik");
      return;
    }
    if (editing && nikValue === editing.nik) return;
    const t = setTimeout(async () => {
      const exists = await api.checkEktpNik(nikValue);
      if (exists) {
        setError("nik", { type: "manual", message: "NIK sudah terdaftar" });
      } else {
        clearErrors("nik");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [nikValue, open, editing, setError, clearErrors]);

  const load = () => {
    api.listEktp(search, page, pageSize).then((r) => {
      setItems(r.data);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => {
    api.listWilayah("", 1, 100).then((r) => setWilayahList(r.data));
  }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setScanPreview(null);
    setOpen(true);
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG/PNG)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10 MB");
      return;
    }
    setScanPreview(URL.createObjectURL(file));
    setScanLoading(true);
    try {
      const res = await api.scanEktp(file);
      const data = res.data ?? {};
      const fields = [
        "nik", "nama", "tempat_lahir", "tanggal_lahir", "jenis_kelamin", "alamat",
        "rt", "rw", "agama", "status_perkawinan", "pekerjaan", "kewarganegaraan",
      ] as const;
      let filled = 0;
      for (const field of fields) {
        const value = data[field];
        if (value !== undefined && value !== null && value !== "") {
          setValue(field, value as never, { shouldValidate: true, shouldDirty: true });
          filled += 1;
        }
      }
      if (typeof data.wilayah_id === "number") {
        setValue("wilayah_id", data.wilayah_id, { shouldValidate: true, shouldDirty: true });
      } else if (data.desa) {
        // Fallback: cari wilayah di master berdasarkan nama desa/kecamatan hasil OCR.
        const normalize = (value?: string) =>
          (value ?? "")
            .toLowerCase()
            .replace(/^(kabupaten|kab\.?|kota|kecamatan|kec\.?|desa|kelurahan|kel\.?)\s+/, "")
            .trim();
        try {
          const found = await api.listWilayah(String(data.desa), 1, 20);
          const targetDesa = normalize(String(data.desa));
          const targetKec = normalize(String(data.kecamatan ?? ""));
          const match =
            found.data.find(
              (w) => normalize(w.desa) === targetDesa && (!targetKec || normalize(w.kecamatan) === targetKec)
            ) ?? found.data.find((w) => normalize(w.desa) === targetDesa);
          if (match) {
            setValue("wilayah_id", match.id, { shouldValidate: true, shouldDirty: true });
          } else {
            toast.info("Wilayah tidak ditemukan di master. Pilih wilayah manual.");
          }
        } catch {
          toast.info("Wilayah tidak ditemukan di master. Pilih wilayah manual.");
        }
      }
      if (filled > 0) toast.success("Data e-KTP terisi otomatis, periksa sebelum menyimpan.");
      else toast.warning("Tidak ada field yang terbaca dari foto.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal scan e-KTP");
    } finally {
      setScanLoading(false);
    }
  };

  const handleOpenEdit = (r: EktpRecord) => {
    setEditing(r);
    reset({
      nik: r.nik ?? "",
      nama: r.nama ?? "",
      tempat_lahir: r.tempat_lahir ?? "",
      tanggal_lahir: r.tanggal_lahir ? r.tanggal_lahir.slice(0, 10) : "",
      jenis_kelamin: r.jenis_kelamin ?? "LAKI-LAKI",
      alamat: r.alamat ?? "",
      rt: r.rt ?? "",
      rw: r.rw ?? "",
      wilayah_id: r.wilayah_id ?? null,
      agama: r.agama ?? "ISLAM",
      status_perkawinan: r.status_perkawinan ?? "BELUM KAWIN",
      pekerjaan: r.pekerjaan ?? "",
      kewarganegaraan: r.kewarganegaraan ?? "WNI",
    });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    try {
      if (editing) {
        await api.updateEktp(editing.id, values);
        toast.success("Data e-KTP diperbarui");
      } else {
        await api.createEktp(values);
        toast.success("Data e-KTP ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan data");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteEktp(deleteTarget.id);
      toast.success("Data e-KTP dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus data");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<EktpRecord>[] = [
    {
      key: "nama",
      label: "Nama / NIK",
      render: (r) => (
        <div>
          <p className="font-medium">{r.nama}</p>
          <p className="font-mono text-[11.5px] text-muted-foreground">{r.nik}</p>
        </div>
      ),
    },
    {
      key: "ttl",
      label: "Tempat, Tgl Lahir",
      hideMobile: true,
      render: (r) => `${r.tempat_lahir}, ${formatDateID(r.tanggal_lahir)}`,
    },
    {
      key: "wilayah",
      label: "Wilayah",
      hideMobile: true,
      render: (r) => {
        const nested = r.wilayah;
        if (nested?.desa) {
          return `${nested.desa}, ${nested.kecamatan ?? "-"}, ${nested.kabupaten ?? "-"}`;
        }
        const w = wilayahList.find((x) => x.id === r.wilayah_id);
        return w ? `${w.desa}, ${w.kecamatan}, ${w.kabupaten}` : "-";
      },
    },
    {
      key: "pekerjaan",
      label: "Pekerjaan",
      render: (r) => <Badge variant="secondary">{r.pekerjaan}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => handleOpenEdit(r)}>
            <Pencil className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setDeleteTarget(r)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader title="Data e-KTP" description="Kelola data pihak berdasarkan e-KTP.">
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Data
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
          placeholder="Cari NIK, nama, alamat..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Data tidak ditemukan" />

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
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Data e-KTP" : "Tambah Data e-KTP"}</DialogTitle>
            <DialogDescription>Masukkan informasi sesuai identitas e-KTP.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 py-2">
            {!editing && (
              <div className="col-span-2 space-y-2 rounded-lg border border-dashed p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[12.5px] font-semibold">Scan Foto e-KTP</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Upload foto e-KTP, form terisi otomatis sebelum disimpan.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={scanLoading}
                    onClick={() => scanInputRef.current?.click()}
                  >
                    {scanLoading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    {scanLoading ? "Memproses..." : "Upload Foto"}
                  </Button>
                </div>
                <input
                  ref={scanInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleScanFile}
                />
                {scanPreview && (
                  <div className="h-64 w-full overflow-hidden rounded-md border bg-muted sm:h-80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={scanPreview}
                      alt="Preview foto e-KTP"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label>NIK *</Label>
              <Input placeholder="16 digit NIK" {...register("nik")} aria-invalid={!!errors.nik} />
              {errors.nik && <p className="text-[11.5px] text-destructive">{errors.nik.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input placeholder="Sesuai KTP" {...register("nama")} aria-invalid={!!errors.nama} />
              {errors.nama && <p className="text-[11.5px] text-destructive">{errors.nama.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tempat Lahir *</Label>
              <Input {...register("tempat_lahir")} aria-invalid={!!errors.tempat_lahir} />
              {errors.tempat_lahir && (
                <p className="text-[11.5px] text-destructive">{errors.tempat_lahir.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Lahir *</Label>
              <Input type="date" {...register("tanggal_lahir")} aria-invalid={!!errors.tanggal_lahir} />
              {errors.tanggal_lahir && (
                <p className="text-[11.5px] text-destructive">{errors.tanggal_lahir.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Controller
                control={control}
                name="jenis_kelamin"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAKI-LAKI">LAKI-LAKI</SelectItem>
                      <SelectItem value="PEREMPUAN">PEREMPUAN</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pekerjaan</Label>
              <Controller
                control={control}
                name="pekerjaan"
                render={({ field }) => (
                  <PekerjaanSelect value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status Perkawinan</Label>
              <Controller
                control={control}
                name="status_perkawinan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BELUM KAWIN">BELUM KAWIN</SelectItem>
                      <SelectItem value="KAWIN">KAWIN</SelectItem>
                      <SelectItem value="CERAI HIDUP">CERAI HIDUP</SelectItem>
                      <SelectItem value="CERAI MATI">CERAI MATI</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Alamat *</Label>
              <Input {...register("alamat")} aria-invalid={!!errors.alamat} />
              {errors.alamat && <p className="text-[11.5px] text-destructive">{errors.alamat.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>RT</Label>
              <Input {...register("rt")} />
            </div>
            <div className="space-y-1.5">
              <Label>RW</Label>
              <Input {...register("rw")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Wilayah</Label>
              <Controller
                control={control}
                name="wilayah_id"
                render={({ field }) => (
                  <WilayahSelect value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Data"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="overflow-hidden sm:max-w-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive via-destructive/70 to-destructive/30" />
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus data e-KTP?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data milik{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.nama}</span>{" "}
              (NIK <span className="font-mono">{deleteTarget?.nik}</span>) akan dihapus permanen.
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
