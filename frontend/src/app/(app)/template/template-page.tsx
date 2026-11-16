"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  FileUp,
  FlaskConical,
  LayoutTemplate,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateID } from "@/lib/format";
import { extractVariables, renderTemplate } from "@/lib/template-engine";
import { downloadBlob } from "@/lib/download";
import { ektp, obyek } from "@/lib/mock-data";
import type { Template, TemplateCategory, TemplateGroup } from "@/lib/types";

type TemplateRow = Template & {
  category?: { name: string };
  group?: { name: string };
};

const VARIABLE_REGISTRY = [
  { group: "Pihak", vars: ["pihak.nama", "pihak.nik", "pihak.tempat_lahir", "pihak.tanggal_lahir", "pihak.jenis_kelamin", "pihak.pekerjaan", "pihak.alamat", "pihak.rt", "pihak.rw", "pihak.kelurahan", "pihak.kecamatan", "pihak.agama", "pihak.status_perkawinan", "pihak.kewarganegaraan"] },
  { group: "Penjual/Pembeli", vars: ["penjual[0].nama", "penjual[0].nik", "pembeli[0].nama", "pembeli[0].nik"] },
  { group: "Objek", vars: ["obyek.nomor_hak", "obyek.persil", "obyek.luas_tanah", "obyek.luas_bangunan", "obyek.atas_nama", "obyek.nib", "obyek.no_surat_ukur", "obyek.batas_utara", "obyek.batas_timur", "obyek.batas_selatan", "obyek.batas_barat"] },
  { group: "Relasi", vars: ["obyek.jenishak.nama_jenishak", "obyek.jenishak.singkatan", "obyek.letak.nama_desa"] },
  { group: "Custom Field", vars: ["custom.nomor_akta", "custom.tanggal_akta", "custom.harga_transaksi", "custom.uang_muka", "custom.cara_pembayaran", "custom.nama_saksi_1", "custom.nama_saksi_2"] },
  { group: "Sistem", vars: ["system.company_name", "system.address", "system.phone", "system.permit_number"] },
];

const templateSchema = z.object({
  name: z.string().min(1, "Nama template wajib diisi"),
  code: z
    .string()
    .min(1, "Kode wajib diisi")
    .max(30, "Kode maksimal 30 karakter")
    .regex(/^[A-Za-z0-9_-]+$/, "Kode hanya huruf, angka, strip, underscore"),
  category_id: z.string().min(1, "Kategori wajib dipilih"),
  group_id: z.string(),
  description: z.string(),
  status: z.enum(["draft", "active", "archived"]),
  content: z.string().min(1, "Konten template wajib diisi"),
});

type TemplateForm = z.infer<typeof templateSchema>;

const emptyForm: TemplateForm = {
  name: "",
  code: "",
  category_id: "",
  group_id: "",
  description: "",
  status: "draft",
  content: "",
};

export default function TemplatePage() {
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [catFilter, setCatFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [testTemplate, setTestTemplate] = useState<TemplateRow | null>(null);
  const [contentCache, setContentCache] = useState<Record<number, string>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!testTemplate || contentCache[testTemplate.id] !== undefined) return;
    let active = true;
    api
      .getTemplateContent(testTemplate.id)
      .then((content) => {
        if (active) setContentCache((c) => ({ ...c, [testTemplate.id]: content }));
      })
      .catch(() => {
        // ignore
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testTemplate]);

  const refresh = () => {
    api.listTemplates().then(setRows);
    api.listCategories().then(setCategories);
    api.listGroups().then(setGroups);
  };

  useEffect(refresh, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter((t) => {
      const matchQ =
        !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
      const matchC = catFilter === "all" || String(t.category_id) === catFilter;
      const matchG = groupFilter === "all" || String(t.group_id) === groupFilter;
      const matchS = statusFilter === "all" || t.status === statusFilter;
      return matchQ && matchC && matchG && matchS;
    });
  }, [rows, search, catFilter, groupFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page]
  );

  useEffect(() => {
    const id = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(id);
  }, [search, catFilter, groupFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      const id = setTimeout(() => setPage(totalPages), 0);
      return () => clearTimeout(id);
    }
  }, [page, totalPages]);

  const handleOpenCreate = () => {
    setEditing(null);
    setPendingFile(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (t: TemplateRow) => {
    setEditing(t);
    setPendingFile(null);
    let content = "";
    try {
      content = await api.getTemplateContent(t.id);
    } catch {
      content = "";
    }
    setContentCache((c) => ({ ...c, [t.id]: content }));
    reset({
      name: t.name,
      code: t.code,
      category_id: t.category_id ? String(t.category_id) : "",
      group_id: t.group_id ? String(t.group_id) : "",
      description: t.description,
      status: t.status,
      content,
    });
    setDialogOpen(true);
  };

  const handleSave = handleSubmit(async (values) => {
    const payload = {
      name: values.name,
      code: values.code,
      description: values.description,
      category_id: values.category_id ? Number(values.category_id) : null,
      group_id: values.group_id ? Number(values.group_id) : null,
      status: values.status,
    };
    try {
      if (editing) {
        await api.updateTemplate(editing.id, payload);
        await api.updateTemplateContent(editing.id, values.content);
        if (pendingFile) await api.uploadTemplateDocx(editing.id, pendingFile);
        setContentCache((c) => ({ ...c, [editing.id]: values.content }));
        toast.success("Template diperbarui");
      } else {
        const created = await api.createTemplate({ ...payload, content: values.content });
        if (values.content) await api.updateTemplateContent(created.id, values.content);
        if (pendingFile) await api.uploadTemplateDocx(created.id, pendingFile);
        setContentCache((c) => ({ ...c, [created.id]: values.content }));
        toast.success("Template berhasil dibuat");
      }
      setDialogOpen(false);
      setPendingFile(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan template");
    }
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteTemplate(deleteTarget.id);
      toast.success("Template dihapus");
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus template");
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateTest = async () => {
    if (!testTemplate) return;
    try {
      const blob = await api.generateTemplateTestDocx(testTemplate.id, sampleContext);
      downloadBlob(blob, `${testTemplate.code}-test.docx`);
      toast.success("Test DOCX berhasil diunduh");
    } catch (e) {
      toast.error("Gagal membuat Test DOCX", { description: e instanceof Error ? e.message : undefined });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      toast.error("File harus berformat .docx");
      return;
    }
    if (editing) {
      try {
        const res = await api.uploadTemplateDocx(editing.id, file);
        setValue("content", res.content);
        setPendingFile(file);
        toast.success("File DOCX diunggah", {
          description: "Konten diambil dari file. Simpan untuk menerapkan.",
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal mengunggah file");
      }
    } else {
      setPendingFile(file);
      toast.info("File DOCX siap diunggah", {
        description: "File akan diunggah setelah template dibuat.",
      });
    }
  };

  const sampleContext = {
    pihak: { ...ektp[0] },
    penjual: [{ ...ektp[0] }],
    pembeli: [{ ...ektp[2] }],
    obyek: { ...obyek[0], jenishak: { nama_jenishak: "Hak Milik", singkatan: "HM" }, letak: { nama_desa: "Ngemplak Kidul", kecamatan: "Jepara" } },
    custom: { nomor_akta: "12/2026", tanggal_akta: "2026-10-04", harga_transaksi: 500000000, cara_pembayaran: "Tunai", nama_saksi_1: "Saksi Satu" },
    system: { company_name: "PPAT & Notaris Ahmad Fauzi, S.H., M.Kn." },
  };

  return (
    <div>
      <PageHeader
        title="Template"
        description="Kelola template Word, kategori, dan group untuk pembuatan dokumen."
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="size-4" /> Tambah Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Template" : "Tambah Template"}</DialogTitle>
              <DialogDescription>
                {editing
                  ? "Ubah metadata dan konten template."
                  : "Buat metadata template, lalu isi konten template."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSave} className="grid gap-3.5 py-2">
              <div className="space-y-1.5">
                <Label>Nama Template *</Label>
                <Input placeholder="Akta Jual Beli" {...register("name")} aria-invalid={!!errors.name} />
                {errors.name && (
                  <p className="text-[11.5px] text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kode *</Label>
                  <Input placeholder="AJB" {...register("code")} aria-invalid={!!errors.code} />
                  {errors.code && (
                    <p className="text-[11.5px] text-destructive">{errors.code.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Kategori *</Label>
                  <Controller
                    control={control}
                    name="category_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={!!errors.category_id}>
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category_id && (
                    <p className="text-[11.5px] text-destructive">{errors.category_id.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Group</Label>
                  <Controller
                    control={control}
                    name="group_id"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={String(g.id)}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea
                  rows={2}
                  placeholder="Deskripsi singkat template"
                  {...register("description")}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Konten Template *</Label>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 text-[12px] text-primary hover:underline"
                  >
                    <FileUp className="size-3.5" /> Upload file (.docx)
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                    e.target.value = "";
                  }}
                />
                <Textarea
                  rows={10}
                  placeholder={"Gunakan placeholder {{variabel}}\nContoh:\nYang bertanda tangan {{penjual[0].nama}}, NIK {{penjual[0].nik}}..."}
                  className="font-mono text-[12.5px]"
                  aria-invalid={!!errors.content}
                  {...register("content")}
                />
                {errors.content && (
                  <p className="text-[11.5px] text-destructive">{errors.content.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan Template"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari template..."
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Group</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="Template tidak ditemukan"
          description="Ubah filter atau buat template baru."
        />
      ) : (
        <>
          <Card className="hidden border shadow-none md:block">
            <CardContent className="p-0">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b text-[11.5px] tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-semibold">Nama</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="hidden px-4 py-3 font-semibold lg:table-cell">Group</th>
                    <th className="px-4 py-3 font-semibold">Versi</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FileUp className="size-4.5" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{t.name}</p>
                            <p className="text-[11.5px] text-muted-foreground">
                              {t.code} · {formatDateID(t.updated_at)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{t.category?.name}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{t.group?.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">v{t.version}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Test template"
                            onClick={() => setTestTemplate(t)}
                          >
                            <FlaskConical className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit"
                            onClick={() => handleOpenEdit(t)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Download"
                            onClick={async () => {
                              try {
                                const blob = await api.downloadTemplate(t.id);
                                downloadBlob(
                                  blob,
                                  `${t.code}-v${t.version}-template.docx`
                                );
                                toast.success("Template diunduh", {
                                  description: `${t.code}-v${t.version}-template.docx`,
                                });
                              } catch (e) {
                                toast.error("Gagal mengunduh template", {
                                  description:
                                    e instanceof Error ? e.message : undefined,
                                });
                              }
                            }}
                          >
                            <Download className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Duplikat"
                            onClick={() => toast.success("Template diduplikasi")}
                          >
                            <Copy className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Hapus"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="space-y-3 md:hidden">
            {paged.map((t) => (
              <Card key={t.id} className="border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileUp className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">{t.name}</p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {t.category?.name} · {t.group?.name} · v{t.version}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge status={t.status} />
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setTestTemplate(t)}
                        >
                          <FlaskConical className="size-3" /> Test
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleOpenEdit(t)}
                        >
                          <Pencil className="size-3" /> Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-muted-foreground">
            <span>
              Menampilkan {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filtered.length)} dari {filtered.length}
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
        </>
      )}

      <Dialog open={testTemplate !== null} onOpenChange={(o) => !o && setTestTemplate(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Test Template — {testTemplate?.name}</DialogTitle>
            <DialogDescription>
              Uji placeholder dengan data sample sebelum digunakan.
            </DialogDescription>
          </DialogHeader>
          {testTemplate && (
            <Tabs defaultValue="preview">
              <TabsList className="w-full">
                <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                <TabsTrigger value="variables" className="flex-1">Variable Browser</TabsTrigger>
              </TabsList>
              <TabsContent value="preview">
                {contentCache[testTemplate.id] ? (
                  <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/30 p-4 scrollbar-thin">
                    <pre className="font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap">
                      {renderTemplate(contentCache[testTemplate.id], sampleContext)}
                    </pre>
                  </div>
                ) : (
                  <EmptyState icon={FileUp} title="Konten belum tersedia" description="Isi konten template untuk melihat preview." />
                )}
                <Button
                  className="mt-3 w-full"
                  onClick={handleGenerateTest}
                >
                  <FlaskConical className="size-4" /> Generate Test DOCX
                </Button>
              </TabsContent>
              <TabsContent value="variables">
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                  {VARIABLE_REGISTRY.map((g) => (
                    <div key={g.group}>
                      <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {g.group}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.vars.map((v) => (
                          <button
                            key={v}
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${v}}}`);
                              toast.success("Variable disalin", { description: `{{${v}}}` });
                            }}
                            className="rounded-md border bg-muted/50 px-2 py-1 font-mono text-[11px] transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {testTemplate && contentCache[testTemplate.id] && (
                    <div>
                      <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        Terdeteksi pada template
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {extractVariables(contentCache[testTemplate.id]).map((v) => (
                          <span key={v} className="rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] text-primary">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <span className="font-semibold text-foreground">{deleteTarget?.name}</span>{" "}
              beserta seluruh versinya akan dihapus permanen.
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
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
