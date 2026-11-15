"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DataGrid, type Column } from "@/components/data-grid";
import { StatusBadge } from "@/components/status-badge";
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
import { formatDateID } from "@/lib/format";
import type { User } from "@/lib/types";

interface RoleOption {
  id: number;
  name: string;
  description: string;
}

const emptyForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  roles: [] as string[],
  is_active: true,
};

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const pageSize = 10;

  const load = () => {
    api.listUsers(search, page, pageSize).then((r) => {
      setItems(r.data);
      setTotal(r.total);
    });
  };

  useEffect(() => {
    api.listRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, page]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      email: u.email,
      password: "",
      roles: [...u.roles],
      is_active: u.is_active,
    });
    setOpen(true);
  };

  const toggleRole = (role: string) =>
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast.error("Nama dan username wajib diisi");
      return;
    }
    if (!editing && form.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    if (editing && form.password && form.password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.updateUser(editing.id, {
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password || undefined,
          roles: form.roles,
          is_active: form.is_active,
        });
        toast.success("User diperbarui");
      } else {
        await api.createUser({
          name: form.name.trim(),
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          roles: form.roles,
          is_active: form.is_active,
        });
        toast.success("User dibuat");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteUser(deleteTarget.id);
      toast.success("User dihapus");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus user");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "User",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="gradient-brand flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
            {r.name.charAt(0)}
          </span>
          <div>
            <p className="font-medium">{r.name}</p>
            <p className="text-[11.5px] text-muted-foreground">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "username",
      label: "Username",
      hideMobile: true,
      render: (r) => <span className="font-mono text-[12px]">{r.username}</span>,
    },
    {
      key: "roles",
      label: "Roles",
      hideMobile: true,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {role}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Terdaftar",
      hideMobile: true,
      render: (r) => formatDateID(r.created_at),
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

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader title="Users" description="Kelola pengguna aplikasi beserta role-nya.">
        <Button onClick={handleOpenCreate}>
          <UserPlus className="size-4" /> Tambah User
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
          placeholder="Cari nama, username, email..."
          className="pl-9"
        />
      </div>

      <DataGrid items={items} columns={columns} emptyTitle="User tidak ditemukan" />

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
            <DialogTitle>{editing ? "Edit User" : "Tambah User"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui data user dan role-nya." : "Buat akun pengguna baru."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama pengguna"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Username *</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="opsional"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{editing ? "Password Baru" : "Password *"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12.5px]"
                  >
                    <Checkbox
                      checked={form.roles.includes(role.name)}
                      onCheckedChange={() => toggleRole(role.name)}
                    />
                    {role.name}
                  </label>
                ))}
                {roles.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">Role belum tersedia.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label className="cursor-pointer">Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat User"}
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
            <AlertDialogTitle className="pt-2">Hapus user?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>{" "}
              (<span className="font-mono">{deleteTarget?.username}</span>) akan dihapus permanen.
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
