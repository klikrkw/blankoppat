"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSignature,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
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

const FEATURES = [
  { icon: FileText, text: "Generate dokumen .docx otomatis dari template Word" },
  { icon: Sparkles, text: "Terbilang angka & tanggal Indonesia" },
  { icon: ShieldCheck, text: "Role, permission & audit trail lengkap" },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const u = await login(username, password);
    setBusy(false);
    if (!u) {
      toast.error("Login gagal", {
        description:
          "Periksa username/password, atau pastikan backend FastAPI berjalan.",
      });
      return;
    }
    toast.success(`Selamat datang, ${u.name.split(" ")[0]}!`);
    router.replace("/dashboard");
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <div className="gradient-brand relative hidden flex-1 flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <FileSignature className="size-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight">
              Blanko <span className="font-light">PPAT</span>
            </p>
            <p className="text-xs text-white/70">Aplikasi Dokumen PPAT</p>
          </div>
        </div>
        <div className="relative">
          <h1 className="max-w-md text-3xl leading-tight font-bold tracking-tight">
            Buat Blanko PPAT Otomatis dalam Hitungan Menit
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
            Data e-KTP, objek tanah, dan custom field diolah menjadi dokumen
            akta siap cetak tanpa mengetik ulang.
          </p>
          <div className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="size-4" />
                </span>
                <p className="text-sm text-white/90">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/60">
          © 2026 Blanko PPAT — Mobile friendly · Light/Dark mode
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="gradient-brand flex size-10 items-center justify-center rounded-xl text-white">
              <FileSignature className="size-5" />
            </div>
            <div>
              <p className="font-bold tracking-tight">
                Blanko <span className="text-primary">PPAT</span>
              </p>
              <p className="text-xs text-muted-foreground">Aplikasi Dokumen PPAT</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Masuk ke Aplikasi</CardTitle>
              <CardDescription>
                Gunakan akun Anda untuk melanjutkan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <UserRound className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-8"
                      placeholder="admin"
                      autoComplete="username"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-8"
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={busy}>
                  {busy && <Loader2 className="animate-spin" />}
                  Masuk
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
