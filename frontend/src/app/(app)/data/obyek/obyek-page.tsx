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
import { DataGrid, type Column } from "@/components/data-grid";
import { formatDateID, formatJenisSertipikat, formatNumber } from "@/lib/format";
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
import type { Edisi, JenisHak, Obyek, Wilayah } from "@/lib/types";
import { WilayahSelect } from "@/components/wilayah-select";

type ObyekRow = Obyek & { jenishak?: JenisHak; wilayah?: Wilayah };
type JenisHakItem = { id: number; nama_jenishak: string; singkatan: string };

const NOP_GROUPS = [2, 2, 3, 3, 3, 4, 1];

function formatNop(value: string) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 18);
  const parts: string[] = [];
  let index = 0;
  for (const size of NOP_GROUPS) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }
  return parts.join(".");
}

const obyekSchema = z.object({
  jenishak_id: z.number({ message: "Jenis hak wajib dipilih " }).nullable(),
  jenis_sertipikat: z.enum(["analog", "elektronik"]),
  nomor_hak: z.string().min(1, "Nomor hak wajib diisi"),
  persil: z.string(),
  klas: z.string(),
  luas_tanah: z.number().min(0, "Luas tanah tidak valid"),
  luas_bangunan: z.number().nullable(),
  atas_nama: z.string().min(1, "Atas nama wajib diisi"),
  penggunaan: z.enum(["pertanian", "non-pertanian"]),
  no_surat_ukur: z.string(),
  tanggal_surat_ukur: z.string(),
  nib: z.string(),
  nomor_seri_blanko: z.string(),
  nop: z
    .string()
    .refine(
      (value) => value === "" || value.replace(/\D/g, "").length === 18,
      "NOP harus 18 digit (mis. 33.18.100.027.013.0211.0)"
    ),
  batas_utara: z.string(),
  batas_timur: z.string(),
  batas_selatan: z.string(),
  batas_barat: z.string(),
  wilayah_id: z.number().nullable(),
  edisi_id: z.number().nullable(),
});

type ObyekForm = z.infer<typeof obyekSchema>;

const todayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
};

const emptyForm: ObyekForm = {
  jenishak_id: null,
  jenis_sertipikat: "elektronik",
  nomor_hak: "",
  persil: "",
  klas: "",
  luas_tanah: 0,
  luas_bangunan: null,
  atas_nama: "",
  penggunaan: "non-pertanian",
  no_surat_ukur: "",
  tanggal_surat_ukur: todayStr(),
  nib: "",
  nop: "",
  nomor_seri_blanko: "",
  batas_utara: "",
  batas_timur: "",
  batas_selatan: "",
  batas_barat: "",
  wilayah_id: null,
  edisi_id: null,
};

export default function ObyekPage() {
  const [items, setItems] = useState<ObyekRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<ObyekRow | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ObyekRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ObyekRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [jenishakList, setJenishakList] = useState<JenisHakItem[]>([]);
  const [edisiList, setEdisiList] = useState<Edisi[]>([]);
  const pageSize = 10;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ObyekForm>({
    resolver: zodResolver(obyekSchema),
    defaultValues: emptyForm,
  });

  const load = () => {
    api.listObyek(search, page, pageSize).then((r) => {
      setItems(r.data as ObyekRow[]);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  useEffect(() => {
    api.listJenishak().then(setJenishakList);
    api.listEdisi().then((r) => setEdisiList(r.data));
  }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    reset(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (r: ObyekRow) => {
    setEditing(r);
    reset({
      jenishak_id: r.jenishak_id ?? null,
      jenis_sertipikat:
        r.jenis_sertipikat === "manual"
          ? "analog"
          : r.jenis_sertipikat ?? "elektronik",
      nomor_hak: r.nomor_hak ?? "",
      persil: r.persil ?? "",
      klas: r.klas ?? "",
      luas_tanah: r.luas_tanah ?? 0,
      luas_bangunan: r.luas_bangunan ?? null,
      atas_nama: r.atas_nama ?? "",
      penggunaan: r.penggunaan ?? "non-pertanian",
      no_surat_ukur: r.no_surat_ukur ?? "",
      tanggal_surat_ukur: r.tanggal_surat_ukur ? r.tanggal_surat_ukur.slice(0, 10) : "",
      nib: r.nib ?? "",
      nop: r.nop ? formatNop(r.nop) : "",
      nomor_seri_blanko: r.nomor_seri_blanko ?? "",
      batas_utara: r.batas_utara ?? "",
      batas_timur: r.batas_timur ?? "",
      batas_selatan: r.batas_selatan ?? "",
      batas_barat: r.batas_barat ?? "",
      wilayah_id: r.wilayah_id ?? null,
      edisi_id: r.edisi_id ?? null,
    });
    setOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    if (values.jenishak_id == null) {
      toast.error("Jenis hak wajib dipilih");
      return;
    }
    const payload = { ...values, jenishak_id: values.jenishak_id };
    try {
      if (editing) {
        await api.updateObyek(editing.id, payload);
        toast.success("Objek tanah diperbarui");
      } else {
        await api.createObyek(payload);
        toast.success("Objek tanah ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan objek");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteObyek(deleteTarget.id);
      toast.success("Objek tanah dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus objek");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<ObyekRow>[] = [
    {
      key: "nomor_hak",
      label: "Nomor Hak",
      render: (r) => (
        <div>
          <p className="font-medium">No. {r.nomor_hak}</p>
          <p className="text-[11.5px] text-muted-foreground">
            {r.jenishak?.nama_jenishak ?? "-"} · {formatJenisSertipikat(r.jenis_sertipikat)}
          </p>
        </div>
      ),
    },
    {
      key: "luas",
      label: "Luas",
      hideMobile: true,
      render: (r) => `${formatNumber(r.luas_tanah)} m²`,
    },
    {
      key: "nib",
      label: "NIB",
      hideMobile: true,
      render: (r) => <span className="font-mono text-[12px]">{r.nib}</span>,
    },
    {
      key: "nop",
      label: "NOP",
      hideMobile: true,
      render: (r) => <span className="font-mono text-[12px]">{r.nop || "-"}</span>,
    },
    {
      key: "atas_nama",
      label: "Atas Nama",
      hideMobile: true,
      render: (r) => r.atas_nama,
    },
    {
      key: "letak",
      label: "Letak",
      render: (r) => (
        <div className="text-[12.5px] leading-tight">
          <p className="font-medium">{r.wilayah?.desa ?? "-"}</p>
          {r.wilayah?.kecamatan && (
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">{r.wilayah.kecamatan}</p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(r);
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(r);
            }}
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
        title="Objek Tanah"
        description="Kelola objek tanah berdasarkan nomor hak, NIB, persil, atau nama."
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Objek
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
          placeholder="Cari nomor hak, NIB, persil, nama..."
          className="pl-9"
        />
      </div>

      <DataGrid
        items={items}
        columns={columns}
        onRowClick={setDetail}
        emptyTitle="Objek tidak ditemukan"
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

      {/* Detail */}
      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Objek Tanah — No. Hak {detail?.nomor_hak}</DialogTitle>
            <DialogDescription>Detail data objek tanah</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-[13px]">
              {[
                ["Jenis Hak", `${detail.jenishak?.nama_jenishak} (${detail.jenishak?.singkatan})`],
                ["Sertipikat", formatJenisSertipikat(detail.jenis_sertipikat)],
                ["Edisi", detail.edisi?.nama_edisi ?? "-"],
                ["Persil / Klas", `${detail.persil} / ${detail.klas}`],
                ["Luas Tanah", `${formatNumber(detail.luas_tanah)} m²`],
                ["Luas Bangunan", detail.luas_bangunan ? `${formatNumber(detail.luas_bangunan)} m²` : "-"],
                ["Atas Nama", detail.atas_nama],
                ["Penggunaan", detail.penggunaan],
                ["No. Surat Ukur", `${detail.no_surat_ukur} (${formatDateID(detail.tanggal_surat_ukur)})`],
                ["NIB", detail.nib],
                ["NOP", detail.nop || "-"],
                ["Nomor Seri Blanko", detail.nomor_seri_blanko || "-"],
                ["Letak", `${detail.wilayah?.desa ?? "-"}, ${detail.wilayah?.kecamatan ?? ""}, ${detail.wilayah?.kabupaten ?? ""}`],
                ["Batas Utara", detail.batas_utara],
                ["Batas Timur", detail.batas_timur],
                ["Batas Selatan", detail.batas_selatan],
                ["Batas Barat", detail.batas_barat],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b pb-2 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="text-right font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Add/Edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Objek Tanah" : "Tambah Objek Tanah"}</DialogTitle>
            <DialogDescription>Masukkan data objek tanah.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Jenis Hak *</Label>
              <Controller
                control={control}
                name="jenishak_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                  >
                    <SelectTrigger aria-invalid={!!errors.jenishak_id}>
                      <SelectValue placeholder="Pilih jenis hak" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenishakList.map((j) => (
                        <SelectItem key={j.id} value={String(j.id)}>
                          {j.nama_jenishak} ({j.singkatan})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.jenishak_id && (
                <p className="text-[11.5px] text-destructive">{errors.jenishak_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Sertipikat</Label>
              <Controller
                control={control}
                name="jenis_sertipikat"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analog">Analog</SelectItem>
                      <SelectItem value="elektronik">Elektronik</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Edisi</Label>
              <Controller
                control={control}
                name="edisi_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih edisi" />
                    </SelectTrigger>
                    <SelectContent>
                      {edisiList.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.nama_edisi}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Hak *</Label>
              <Input {...register("nomor_hak")} aria-invalid={!!errors.nomor_hak} />
              {errors.nomor_hak && (
                <p className="text-[11.5px] text-destructive">{errors.nomor_hak.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>NIB</Label>
              <Input {...register("nib")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Nomor Seri Blanko</Label>
              <Input
                placeholder="Contoh: HM-0012345"
                {...register("nomor_seri_blanko")}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>NOP</Label>
              <Controller
                control={control}
                name="nop"
                render={({ field }) => (
                  <Input
                    value={field.value}
                    onChange={(e) => field.onChange(formatNop(e.target.value))}
                    placeholder="33.18.100.027.013.0211.0"
                    inputMode="numeric"
                    maxLength={24}
                    aria-invalid={!!errors.nop}
                  />
                )}
              />
              {errors.nop ? (
                <p className="text-[11.5px] text-destructive">{errors.nop.message}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Format: 2.2.3.3.3.4.1 digit — otomatis diberi titik.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Persil</Label>
              <Input {...register("persil")} />
            </div>
            <div className="space-y-1.5">
              <Label>Klas</Label>
              <Input {...register("klas")} />
            </div>
            <div className="space-y-1.5">
              <Label>Luas Tanah (m²) *</Label>
              <Input
                type="number"
                step="any"
                {...register("luas_tanah", { valueAsNumber: true })}
                aria-invalid={!!errors.luas_tanah}
              />
              {errors.luas_tanah && (
                <p className="text-[11.5px] text-destructive">{errors.luas_tanah.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Luas Bangunan (m²)</Label>
              <Controller
                control={control}
                name="luas_bangunan"
                render={({ field }) => (
                  <Input
                    type="number"
                    step="any"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                )}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Atas Nama *</Label>
              <Input {...register("atas_nama")} aria-invalid={!!errors.atas_nama} />
              {errors.atas_nama && (
                <p className="text-[11.5px] text-destructive">{errors.atas_nama.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Penggunaan</Label>
              <Controller
                control={control}
                name="penggunaan"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pertanian">Pertanian</SelectItem>
                      <SelectItem value="non-pertanian">Non Pertanian</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>No. Surat Ukur</Label>
              <Input {...register("no_surat_ukur")} />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Surat Ukur</Label>
              <Input type="date" {...register("tanggal_surat_ukur")} />
            </div>
            <div className="space-y-1.5">
              <Label>Wilayah</Label>
              <Controller
                control={control}
                name="wilayah_id"
                render={({ field }) => (
                  <WilayahSelect value={field.value} onChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Batas Utara</Label>
              <Input {...register("batas_utara")} />
            </div>
            <div className="space-y-1.5">
              <Label>Batas Timur</Label>
              <Input {...register("batas_timur")} />
            </div>
            <div className="space-y-1.5">
              <Label>Batas Selatan</Label>
              <Input {...register("batas_selatan")} />
            </div>
            <div className="space-y-1.5">
              <Label>Batas Barat</Label>
              <Input {...register("batas_barat")} />
            </div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan Objek"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="overflow-hidden sm:max-w-md">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive via-destructive/70 to-destructive/30" />
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus objek tanah?</AlertDialogTitle>
            <AlertDialogDescription>
              Objek <span className="font-semibold text-foreground">No. {deleteTarget?.nomor_hak}</span>{" "}
              ({deleteTarget?.atas_nama}) akan dihapus permanen.
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
