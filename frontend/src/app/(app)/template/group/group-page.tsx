"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FolderKanban,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
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
import type { TemplateCategory, TemplateGroup } from "@/lib/types";

const NO_CATEGORY = "none";

type GroupForm = {
  name: string;
  code: string;
  description: string;
  category_id: string;
  sort_order: string;
  is_active: boolean;
};

const emptyForm = (sortOrder: number): GroupForm => ({
  name: "",
  code: "",
  description: "",
  category_id: NO_CATEGORY,
  sort_order: String(sortOrder),
  is_active: true,
});

export default function GroupPage() {
  const [groups, setGroups] = useState<TemplateGroup[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateGroup | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm(1));
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TemplateGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const [groupRows, categoryRows] = await Promise.all([
        api.listGroups(),
        api.listCategories(),
      ]);
      setGroups(groupRows);
      setCategories(categoryRows);
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat data group");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.code.toLowerCase().includes(q) ||
        (g.category?.name ?? "").toLowerCase().includes(q) ||
        (g.description ?? "").toLowerCase().includes(q)
    );
  }, [groups, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(groups.length + 1));
    setOpen(true);
  };

  const openEdit = (group: TemplateGroup) => {
    setEditing(group);
    setForm({
      name: group.name,
      code: group.code,
      description: group.description ?? "",
      category_id: group.category_id ? String(group.category_id) : NO_CATEGORY,
      sort_order: String(group.sort_order),
      is_active: group.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nama group wajib diisi");
      return;
    }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description,
      category_id:
        form.category_id === NO_CATEGORY ? null : Number(form.category_id),
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.updateGroup(editing.id, payload);
        toast.success("Group diperbarui");
      } else {
        await api.createGroup(payload);
        toast.success("Group berhasil dibuat");
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan group");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (group: TemplateGroup, is_active: boolean) => {
    setTogglingId(group.id);
    try {
      await api.updateGroup(group.id, {
        name: group.name,
        code: group.code,
        description: group.description ?? "",
        category_id: group.category_id,
        sort_order: group.sort_order,
        is_active,
      });
      setGroups((rows) =>
        rows.map((row) => (row.id === group.id ? { ...row, is_active } : row))
      );
      toast.success(is_active ? "Group diaktifkan" : "Group dinonaktifkan");
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah status group");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteGroup(deleteTarget.id);
      toast.success("Group dihapus");
      setDeleteTarget(null);
      await load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus group");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Group Template"
        description="Kelompokkan template berdasarkan alur transaksi, misal Jual Beli, Hibah, APHT."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Tambah Group
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, kode, atau kategori..."
            className="pl-8"
          />
        </div>
        <p className="text-[12px] text-muted-foreground">
          {filtered.length} dari {groups.length} group
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[148px] animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={groups.length === 0 ? "Belum ada group" : "Group tidak ditemukan"}
          description={
            groups.length === 0
              ? "Tambahkan group pertama untuk mengelompokkan template."
              : "Coba kata kunci lain."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <Card key={g.id} className="border shadow-none">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderKanban className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{g.name}</p>
                    <StatusBadge status={g.is_active ? "active" : "inactive"} />
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {g.code} · Urutan {g.sort_order}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground">
                    {g.description || "-"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Layers className="size-3" />
                      {g.category?.name ?? "Tanpa kategori"}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {g.template_count ?? 0} template
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={g.is_active}
                        disabled={togglingId === g.id}
                        onCheckedChange={(v) => toggleActive(g, v)}
                      />
                      <span className="text-[11.5px] text-muted-foreground">
                        {g.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        title="Edit group"
                        onClick={() => openEdit(g)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        title="Hapus group"
                        onClick={() => setDeleteTarget(g)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Group" : "Tambah Group"}</DialogTitle>
            <DialogDescription>
              Group mengelompokkan template berdasarkan alur transaksi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3.5 py-2">
            <div className="space-y-1.5">
              <Label>Nama *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jual Beli"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="Otomatis dari nama"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Urutan</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Tanpa kategori</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opsional"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              Aktif
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : editing ? "Simpan" : "Buat"}
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
            <AlertDialogTitle className="pt-2">Hapus group?</AlertDialogTitle>
            <AlertDialogDescription>
              Group <span className="font-semibold text-foreground">{deleteTarget?.name}</span>{" "}
              akan dihapus. Group yang masih dipakai template tidak dapat dihapus.
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
