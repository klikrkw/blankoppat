"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Pencil, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";

interface RoleItem {
  id: number;
  name: string;
  description: string;
  user_count: number;
  permissions: string[];
}

interface PermissionItem {
  id: number;
  name: string;
  module: string;
  description: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    api.listRoles().then(setRoles);
    api.listPermissions().then(setPermissions);
  };

  useEffect(load, []);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, PermissionItem[]> = {};
    for (const perm of permissions) {
      groups[perm.module] = groups[perm.module] ?? [];
      groups[perm.module].push(perm);
    }
    return groups;
  }, [permissions]);

  const togglePermission = (roleId: number, perm: string) => {
    setRoles((rs) =>
      rs.map((r) => {
        if (r.id !== roleId) return r;
        const has = r.permissions.includes(perm);
        return {
          ...r,
          permissions: has ? r.permissions.filter((p) => p !== perm) : [...r.permissions, perm],
        };
      })
    );
  };

  const savePermissions = async (role: RoleItem) => {
    setSavingId(role.id);
    try {
      await api.updateRole(role.id, {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      });
      toast.success(`Permission role ${role.name} disimpan`);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan permission");
    } finally {
      setSavingId(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setOpen(true);
  };

  const openEdit = (role: RoleItem) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description });
    setOpen(true);
  };

  const handleSaveRole = async () => {
    if (!form.name.trim()) {
      toast.error("Nama role wajib diisi");
      return;
    }
    try {
      if (editing) {
        await api.updateRole(editing.id, {
          name: form.name.trim(),
          description: form.description,
          permissions: editing.permissions,
        });
        toast.success("Role diperbarui");
      } else {
        await api.createRole({
          name: form.name.trim(),
          description: form.description,
          permissions: [],
        });
        toast.success("Role dibuat");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan role");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteRole(deleteTarget.id);
      toast.success("Role dihapus");
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menghapus role");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Roles" description="Atur role dan permission-nya langsung dari database.">
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Tambah Role
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.id} className="border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4.5 text-primary" />
                    <p className="font-semibold">{role.name}</p>
                    <StatusBadge status={role.user_count > 0 ? "active" : "inactive"} />
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted-foreground">
                    {role.description || "-"} · {role.user_count} user
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(role)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-destructive"
                    onClick={() => setDeleteTarget(role)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <div key={module}>
                    <p className="mb-1 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {module}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {perms.map((perm) => (
                        <label
                          key={perm.name}
                          className="flex cursor-pointer items-center gap-2 text-[12px]"
                          title={perm.description}
                        >
                          <Checkbox
                            checked={role.permissions.includes(perm.name)}
                            onCheckedChange={() => togglePermission(role.id, perm.name)}
                          />
                          <span className="font-mono text-[11.5px]">{perm.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {permissions.length === 0 && (
                  <p className="text-[12px] text-muted-foreground">Belum ada permission di database.</p>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Badge variant="outline">{role.permissions.length} permission</Badge>
                <Button
                  size="sm"
                  onClick={() => savePermissions(role)}
                  disabled={savingId === role.id}
                >
                  <Save className="size-3.5" />
                  {savingId === role.id ? "Menyimpan..." : "Simpan Permission"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Role" : "Tambah Role"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui nama dan deskripsi role." : "Role baru tanpa permission."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Role *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Kasir"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveRole}>{editing ? "Simpan" : "Buat"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus role?</AlertDialogTitle>
            <AlertDialogDescription>
              Role <span className="font-semibold text-foreground">{deleteTarget?.name}</span> akan
              dihapus. Role yang masih dipakai user tidak dapat dihapus.
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
