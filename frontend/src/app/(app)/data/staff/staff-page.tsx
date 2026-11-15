"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  IdCard,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import type { EktpRecord, Job, Staff } from "@/lib/types";

const NO_JOB = "none";

type StaffForm = {
  ektp_id: number | null;
  job_id: string;
  jabatan: string;
};

const emptyForm: StaffForm = { ektp_id: null, job_id: NO_JOB, jabatan: "" };

export default function StaffPage() {
  const [items, setItems] = useState<Staff[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [selectedEktp, setSelectedEktp] = useState<EktpRecord | null>(null);
  const [ektpSearch, setEktpSearch] = useState("");
  const [ektpResults, setEktpResults] = useState<EktpRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 10;

  const load = () => {
    api.listStaff(search, page, pageSize).then((r) => {
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
    api.listJobs("", 1, 1000).then((r) => setJobs(r.data));
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      api
        .listEktp(ektpSearch, 1, 20)
        .then((r) => setEktpResults(r.data))
        .catch(() => setEktpResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [ektpSearch, open]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedEktp(null);
    setEktpSearch("");
    setOpen(true);
  };

  const openEdit = (row: Staff) => {
    setEditing(row);
    setForm({
      ektp_id: row.ektp_id,
      job_id: row.job_id ? String(row.job_id) : NO_JOB,
      jabatan: row.jabatan ?? "",
    });
    setSelectedEktp(row.ektp ?? null);
    setEktpSearch("");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.ektp_id) {
      toast.error("Pilih e-KTP staff");
      return;
    }
    const payload = {
      ektp_id: form.ektp_id,
      job_id: form.job_id === NO_JOB ? null : Number(form.job_id),
      jabatan: form.jabatan.trim(),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.updateStaff(editing.id, payload);
        toast.success("Staff diperbarui");
      } else {
        await api.createStaff(payload);
        toast.success("Staff ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan staff");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteStaff(deleteTarget.id);
      toast.success("Staff dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus staff");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Staff>[] = [
    {
      key: "nama",
      label: "Staff",
      render: (row) => (
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.nama || "-"}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{row.nik || "-"}</p>
            {row.jabatan && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{row.jabatan}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "job",
      label: "Job",
      render: (row) =>
        row.job ? (
          <Badge variant="secondary">{row.job.name}</Badge>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(row)}>
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
        title="Staff"
        description="Hubungkan e-KTP dengan job. Data staff dapat dipanggil di template berdasarkan nama job."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Tambah Staff
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
          placeholder="Cari nama, NIK, jabatan, atau job..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="Staff tidak ditemukan" />

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
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff" : "Tambah Staff"}</DialogTitle>
            <DialogDescription>
              Pilih e-KTP, job, dan isi jabatan spesifik bila berbeda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>e-KTP *</Label>
              {selectedEktp ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
                  <IdCard className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{selectedEktp.nama}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {selectedEktp.nik}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    onClick={() => {
                      setSelectedEktp(null);
                      setForm({ ...form, ektp_id: null });
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={ektpSearch}
                      onChange={(e) => setEktpSearch(e.target.value)}
                      placeholder="Cari nama atau NIK..."
                      className="pl-9"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-lg border">
                    {ektpResults.length === 0 ? (
                      <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                        Tidak ditemukan
                      </p>
                    ) : (
                      ektpResults.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            setSelectedEktp(e);
                            setForm({ ...form, ektp_id: e.id });
                            setEktpSearch("");
                          }}
                          className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-accent"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[12.5px] font-medium">
                              {e.nama}
                            </span>
                            <span className="block font-mono text-[10.5px] text-muted-foreground">
                              {e.nik}
                            </span>
                          </span>
                          <Plus className="size-3.5 shrink-0 text-muted-foreground" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Job</Label>
              <Select
                value={form.job_id}
                onValueChange={(v) => setForm({ ...form, job_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_JOB}>Tanpa job</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={String(job.id)}>
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Job dipakai sebagai kunci template: {`{{staff('Nama Job').nama}}`}.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Jabatan</Label>
              <Input
                value={form.jabatan}
                onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                placeholder="Contoh: Pejabat Pembuat Akta Tanah"
              />
              <p className="text-[11px] text-muted-foreground">
                Opsional, mis. jabatan lengkap yang dipakai di dokumen.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus staff?</AlertDialogTitle>
            <AlertDialogDescription>
              Staff <span className="font-semibold text-foreground">{deleteTarget?.nama}</span> akan
              dihapus dari daftar. Data e-KTP tidak ikut terhapus.
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
