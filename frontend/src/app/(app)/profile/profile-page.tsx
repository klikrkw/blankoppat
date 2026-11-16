"use client";

import { useState } from "react";
import { BadgeCheck, Mail, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AccountTabs } from "@/components/account-tabs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateID } from "@/lib/format";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div>
        <PageHeader title="Update Profil" description="Memuat data profil..." />
        <Skeleton className="h-64 w-full max-w-2xl rounded-xl" />
      </div>
    );
  }

  return <ProfileForm key={user.id} user={user} />;
}

function ProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      toast.error("Nama dan username wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
      });
      updateUser(updated);
      setForm({
        name: updated.name,
        username: updated.username,
        email: updated.email,
      });
      toast.success("Profil berhasil diperbarui");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Update Profil"
        description="Perbarui data akun yang Anda gunakan untuk masuk aplikasi."
      >
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </PageHeader>

      <AccountTabs />

      <Card className="max-w-2xl border shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <UserRound className="size-4.5 text-primary" /> Informasi Profil
          </CardTitle>
          <CardDescription>
            Username digunakan untuk login. Email harus unik antar pengguna.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4 rounded-xl border bg-muted/30 p-4">
            <span className="gradient-brand flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white">
              {user.name?.charAt(0) ?? "U"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{user.name}</p>
              <p className="truncate font-mono text-[12px] text-muted-foreground">
                @{user.username}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <BadgeCheck className="size-3.5 text-primary" />
                <span>{user.roles?.join(", ") || "Tanpa role"}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="profile-name">Nama Lengkap *</Label>
              <Input
                id="profile-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-username">Username *</Label>
              <Input
                id="profile-username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="profile-email"
                  type="email"
                  className="pl-9"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nama@email.com"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Terdaftar Sejak</Label>
              <p className="text-[13px] text-muted-foreground">
                {user.created_at ? formatDateID(user.created_at) : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
