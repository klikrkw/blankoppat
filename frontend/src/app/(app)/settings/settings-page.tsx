"use client";

import { useEffect, useState } from "react";
import { Building2, IdCard, Plus, Save, Search, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WilayahSelect } from "@/components/wilayah-select";
import type { EktpRecord, SystemSettings } from "@/lib/types";

type SettingsState = Record<string, string>;

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedEktp, setSelectedEktp] = useState<EktpRecord | null>(null);
  const [ektpSearch, setEktpSearch] = useState("");
  const [ektpResults, setEktpResults] = useState<EktpRecord[]>([]);

  useEffect(() => {
    api.getSettings().then((data) => {
      setSettings(data);
      const ektpId = data.ektp_id;
      if (ektpId) {
        api.getEktp(Number(ektpId)).then(setSelectedEktp).catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .listEktp(ektpSearch, 1, 20)
        .then((r) => setEktpResults(r.data))
        .catch(() => setEktpResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [ektpSearch]);

  if (!settings) {
    return (
      <div>
        <PageHeader title="Settings" description="Memuat pengaturan..." />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const set = (key: keyof SystemSettings, value: unknown) =>
    setSettings((s) => (s ? { ...s, [key]: String(value ?? "") } : s));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings(settings);
      toast.success("Pengaturan berhasil disimpan");
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Pengaturan perusahaan dan sistem aplikasi."
      >
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4" /> {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </PageHeader>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Perusahaan</TabsTrigger>
          <TabsTrigger value="document">Dokumen</TabsTrigger>
          <TabsTrigger value="system">Sistem</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <Card className="max-w-2xl border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Building2 className="size-4.5 text-primary" /> Identitas Perusahaan
              </CardTitle>
              <CardDescription>
                Data perusahaan dapat digunakan di template melalui {`{{system.company_name}}`} dll.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nama Perusahaan / PPAT</Label>
                <Input
                  value={settings.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>e-KTP PPAT / Notaris</Label>
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
                        set("ektp_id", "");
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
                    <div className="max-h-40 overflow-y-auto rounded-lg border">
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
                              set("ektp_id", e.id);
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
                <p className="text-[11px] text-muted-foreground">
                  Terhubung ke master e-KTP. Dipakai di template melalui{" "}
                  {`{{system.ektp.nama}}`}, {`{{system.ektp.nik}}`}, {`{{system.ektp.alamat}}`},
                  dst.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Alamat</Label>
                <Input
                  value={settings.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={settings.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telepon</Label>
                <Input
                  value={settings.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kode Pos</Label>
                <Input
                  value={settings.postal_code}
                  onChange={(e) => set("postal_code", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Wilayah Kantor</Label>
                <WilayahSelect
                  value={settings.wilayah_id ? Number(settings.wilayah_id) : null}
                  onChange={(v) => set("wilayah_id", v ?? "")}
                />
                <p className="text-[11px] text-muted-foreground">
                  Terhubung ke master Wilayah (desa, kecamatan, kabupaten). Bisa dipakai di
                  template melalui {`{{system.wilayah.desa}}`}, {`{{system.wilayah.kecamatan}}`},
                  dst.
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Daerah Kerja</Label>
                <Input
                  value={settings.daerah_kerja}
                  onChange={(e) => set("daerah_kerja", e.target.value)}
                  placeholder="Contoh: Kabupaten Pati"
                />
                <p className="text-[11px] text-muted-foreground">
                  Dipakai di template melalui {`{{system.daerah_kerja}}`}.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Nomor Izin PPAT</Label>
                <Input
                  value={settings.permit_number}
                  onChange={(e) => set("permit_number", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Izin</Label>
                <Input
                  type="date"
                  value={settings.permit_date}
                  onChange={(e) => set("permit_date", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="document" className="mt-4">
          <Card className="max-w-2xl border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Settings2 className="size-4.5 text-primary" /> Pengaturan Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Format Tanggal Default</Label>
                <Input
                  value={settings.default_date_format}
                  onChange={(e) => set("default_date_format", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Contoh: DD MMMM YYYY</p>
              </div>
              <div className="space-y-1.5">
                <Label>Mata Uang</Label>
                <Input
                  value={settings.default_currency}
                  onChange={(e) => set("default_currency", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  value={settings.timezone}
                  onChange={(e) => set("timezone", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Locale</Label>
                <Input
                  value={settings.locale}
                  onChange={(e) => set("locale", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-4">
          <Card className="max-w-2xl border shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px]">
                <Settings2 className="size-4.5 text-primary" /> Pengaturan Sistem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  ["subscription_enabled", "Aktifkan fitur subscription"],
                  ["free_plan_enabled", "Aktifkan paket Free"],
                  ["payment_transfer_enabled", "Aktifkan pembayaran transfer bank"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="text-[13px] font-medium">{label}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Setting key: <span className="font-mono">{key}</span>
                    </p>
                  </div>
                  <Switch
                    checked={settings[key] === "true"}
                    onCheckedChange={(v) => set(key, v ? "true" : "false")}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Invoice Due Days</Label>
                <Input
                  type="number"
                  value={settings.invoice_due_days ?? ""}
                  onChange={(e) => set("invoice_due_days", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Batas waktu pembayaran invoice (hari).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
