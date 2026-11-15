"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { BankAccount } from "@/lib/types";

export default function BankSettingsPage() {
  const [items, setItems] = useState<BankAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    bank_name: "",
    account_name: "",
    account_number: "",
    branch: "",
    is_active: true,
  });

  const load = () => api.getBankAccounts().then(setItems);

  useEffect(() => {
    load();
  }, []);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm({ bank_name: "", account_name: "", account_number: "", branch: "", is_active: true });
    setOpen(true);
  };

  const handleOpenEdit = (r: BankAccount) => {
    setEditing(r);
    setForm({
      bank_name: r.bank_name,
      account_name: r.account_name,
      account_number: r.account_number,
      branch: r.branch,
      is_active: r.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.bank_name.trim() || !form.account_number.trim()) {
      toast.error("Nama bank dan nomor rekening wajib diisi");
      return;
    }
    if (editing) {
      await api.updateBankAccount(editing.id, form);
      toast.success("Rekening diperbarui");
    } else {
      await api.createBankAccount(form);
      toast.success("Rekening ditambahkan");
    }
    setOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteBankAccount(deleteTarget.id);
      toast.success("Rekening dihapus");
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus rekening");
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<BankAccount>[] = [
    {
      key: "bank_name",
      label: "Bank",
      render: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-4" />
          </span>
          <div>
            <p className="font-semibold">{r.bank_name}</p>
            <p className="text-[11.5px] text-muted-foreground">{r.branch}</p>
          </div>
        </div>
      ),
    },
    {
      key: "account_number",
      label: "No. Rekening / a.n.",
      render: (r) => (
        <div>
          <p className="font-mono font-medium">{r.account_number}</p>
          <p className="text-[12px] text-muted-foreground">{r.account_name}</p>
        </div>
      ),
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

  return (
    <div>
      <PageHeader
        title="Rekening Bank"
        description="Kelola data rekening bank untuk pembayaran langganan."
      >
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Tambah Rekening
        </Button>
      </PageHeader>
      <DataGrid items={items} columns={columns} emptyTitle="Belum ada rekening" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rekening" : "Tambah Rekening"}</DialogTitle>
            <DialogDescription>Masukkan informasi rekening bank tujuan pembayaran.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama Bank *</Label>
              <Input
                value={form.bank_name}
                onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                placeholder="BCA, Mandiri, BNI, dll"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Rekening *</Label>
              <Input
                value={form.account_number}
                onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                placeholder="1234567890"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Atas Nama *</Label>
              <Input
                value={form.account_name}
                onChange={(e) => setForm({ ...form, account_name: e.target.value })}
                placeholder="PT / Nama Pemilik"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cabang / Keterangan</Label>
              <Input
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                placeholder="KCU Jakarta"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Label>Aktif</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus rekening bank?</AlertDialogTitle>
            <AlertDialogDescription>
              Rekening <span className="font-semibold text-foreground">{deleteTarget?.bank_name}</span> (
              <span className="font-mono">{deleteTarget?.account_number}</span>) akan dihapus.
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
