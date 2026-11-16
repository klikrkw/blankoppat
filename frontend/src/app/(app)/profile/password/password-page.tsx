"use client";

import { useState } from "react";
import { KeyRound, Lock, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
import { useAuth } from "@/lib/auth";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current_password) {
      toast.error("Password saat ini wajib diisi");
      return;
    }
    if (form.new_password.length < 6) {
      toast.error("Password baru minimal 6 karakter");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    if (form.new_password === form.current_password) {
      toast.error("Password baru harus berbeda dari password saat ini");
      return;
    }
    setSaving(true);
    try {
      await api.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password berhasil diubah");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengubah password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ganti Password"
        description="Perbarui password akun Anda secara berkala untuk menjaga keamanan."
      />

      <AccountTabs />

      <Card className="max-w-2xl border shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px]">
            <KeyRound className="size-4.5 text-primary" /> Password Akun
          </CardTitle>
          <CardDescription>
            {user?.username ? `Akun: @${user.username}. ` : ""}
            Gunakan minimal 6 karakter dan hindari password yang mudah ditebak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Password Saat Ini *</Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="current-password"
                  type="password"
                  className="pl-9"
                  value={form.current_password}
                  onChange={(e) =>
                    setForm({ ...form, current_password: e.target.value })
                  }
                  placeholder="Masukkan password saat ini"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Password Baru *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={form.new_password}
                  onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Konfirmasi Password Baru *</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) =>
                    setForm({ ...form, confirm_password: e.target.value })
                  }
                  placeholder="Ulangi password baru"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border bg-muted/30 p-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Setelah password diubah, sesi Anda saat ini tetap aktif. Jika Anda
                merasa akun pernah diakses orang lain, ubah password lalu logout dan
                login kembali.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                <Save className="size-4" />
                {saving ? "Menyimpan..." : "Simpan Password Baru"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
