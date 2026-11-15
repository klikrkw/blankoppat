"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Plus, Search, Wrench, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { builtInFunctions } from "@/lib/mock-data";
import { evalExpr } from "@/lib/template-engine";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { FunctionItem } from "@/lib/types";

const TEST_CONTEXT = {
  pihak: {
    nama: "AGUS KUNCORO WARDONO",
    nik: "3320011001830001",
    tanggal_lahir: "1985-01-10",
    tempat_lahir: "Jepara",
  },
  obyek: { luas_tanah: 1200, nomor_hak: "1234" },
  custom: { harga_transaksi: 500000000, tanggal_akta: "2026-10-04" },
};

const QUICK_TESTS = [
  { label: "Terbilang angka", expr: "terbilang(custom.harga_transaksi, 'rupiah')" },
  { label: "Terbilang tanggal", expr: "terbilang_tanggal(custom.tanggal_akta)" },
  { label: "Format tanggal", expr: "format_date(pihak.tanggal_lahir, 'dddd, DD MMMM YYYY')" },
  { label: "Format angka", expr: "format_number(obyek.luas_tanah)" },
  { label: "Currency", expr: "currency(custom.harga_transaksi, 'IDR')" },
  { label: "Upper", expr: "upper(pihak.nama)" },
  { label: "Capitalize", expr: "capitalize(pihak.tempat_lahir)" },
];

export default function FunctionPage() {
  const [expr, setExpr] = useState("terbilang(custom.harga_transaksi, 'rupiah')");
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);
  const [customFunctions, setCustomFunctions] = useState<FunctionItem[]>([]);
  const [functionOpen, setFunctionOpen] = useState(false);
  const [editingFunction, setEditingFunction] = useState<FunctionItem | null>(null);
  const [functionForm, setFunctionForm] = useState({ name: "", code: "", description: "", implementation: "", parameters: "", return_type: "text", is_active: true });

  const loadCustomFunctions = () => api.listFunctions().then((r) => setCustomFunctions(r.custom ?? []));
  useEffect(() => { loadCustomFunctions(); }, []);

  const saveCustomFunction = async () => {
    if (!functionForm.name.trim() || !functionForm.implementation.trim()) {
      toast.error("Nama dan DSL function wajib diisi");
      return;
    }
    const payload = { ...functionForm, parameters: functionForm.parameters.split(",").map((x) => x.trim()).filter(Boolean) };
    try {
      if (editingFunction) await api.updateFunction(editingFunction.id, payload);
      else await api.createFunction(payload);
      toast.success(editingFunction ? "Function diperbarui" : "Function ditambahkan");
      setFunctionOpen(false);
      setEditingFunction(null);
      setFunctionForm({ name: "", code: "", description: "", implementation: "", parameters: "", return_type: "text", is_active: true });
      loadCustomFunctions();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Gagal menyimpan function"); }
  };

  const result = useMemo(() => {
    try {
      return String(evalExpr(expr, TEST_CONTEXT));
    } catch {
      return "Error: ekspresi tidak valid";
    }
  }, [expr]);

  const filtered = builtInFunctions.filter(
    (f) =>
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Function Engine"
        description="Fungsi transformasi data yang dapat digunakan pada placeholder template."
      />

      <Card className="mb-6 border shadow-none">
        <CardContent className="p-4 md:p-5">
          <p className="mb-2 text-[11.5px] font-semibold tracking-wider text-muted-foreground uppercase">
            Function Sandbox
          </p>
          <div className="flex gap-2">
            <Input
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              className="font-mono text-[13px]"
              placeholder="terbilang(500000000, 'rupiah')"
            />
            <Button
              onClick={() => {
                setHistory((h) => [{ expr, result }, ...h].slice(0, 8));
              }}
            >
              <Play className="size-4" /> Jalankan
            </Button>
          </div>
          <div className="mt-3 rounded-lg border bg-muted/40 px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">Hasil:</p>
            <p className="mt-0.5 font-mono text-[13px] break-words">{result}</p>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {QUICK_TESTS.map((q) => (
              <button
                key={q.expr}
                onClick={() => setExpr(q.expr)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                  expr === q.expr
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:border-primary/40 hover:text-primary"
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
          {history.length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-3">
              <p className="text-[11px] font-medium text-muted-foreground">Riwayat pengujian</p>
              {history.map((h, i) => (
                <div key={i} className="flex justify-between gap-3 text-[12px]">
                  <span className="truncate font-mono text-muted-foreground">{h.expr}</span>
                  <span className="truncate font-medium">{h.result}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="builtin">
        <TabsList>
          <TabsTrigger value="builtin">Built-in Functions</TabsTrigger>
          <TabsTrigger value="custom">Custom Functions</TabsTrigger>
        </TabsList>
        <TabsContent value="builtin" className="mt-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari function..."
              className="pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => (
              <Card key={f.name} className="border shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[13px] font-bold text-primary">
                      {f.name}
                    </p>
                    <Badge variant="outline">built-in</Badge>
                  </div>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {f.description}
                  </p>
                  <button
                    onClick={() => {
                      const demo = f.example.replace(/{{|}}/g, "");
                      setExpr(demo);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-2.5 rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-primary"
                  >
                    {f.example}
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="custom" className="mt-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">
              Function custom ditulis dalam template DSL dengan argumen <span className="font-mono">$1, $2, ...</span>.
            </p>
            <Button onClick={() => { setEditingFunction(null); setFunctionForm({ name: "", code: "", description: "", implementation: "", parameters: "", return_type: "text", is_active: true }); setFunctionOpen(true); }}>
              <Plus className="size-4" /> Buat Function
            </Button>
          </div>
          {customFunctions.length === 0 ? (
            <Card className="border shadow-none">
              <CardContent className="flex flex-col items-center py-10 text-center">
                <Wrench className="size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-semibold">Belum ada custom function</p>
                <p className="mt-1 max-w-sm text-[12.5px] text-muted-foreground">
                  Contoh: function <span className="font-mono">singkat_kota</span> dengan DSL{" "}
                  <span className="font-mono">{`{{concat($1, ", ", $2)}}`}</span>
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {customFunctions.map((f) => (
                <Card key={f.id} className="border shadow-none">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[13px] font-bold text-primary">{f.name}</p>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => { setEditingFunction(f); setFunctionForm({ name: f.name, code: f.code, description: f.description, implementation: f.implementation, parameters: (f.parameters ?? []).join(", "), return_type: f.return_type, is_active: f.is_active }); setFunctionOpen(true); }}><Pencil className="size-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={async () => { await api.deleteFunction(f.id); toast.success("Function dihapus"); loadCustomFunctions(); }}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">{f.description || "-"}</p>
                    <p className="mt-2 rounded bg-muted px-2 py-1 font-mono text-[11px]">{f.implementation}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={functionOpen} onOpenChange={setFunctionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFunction ? "Edit Function" : "Buat Custom Function"}</DialogTitle>
            <DialogDescription>Gunakan DSL template, argumen direferensikan sebagai $1, $2, ...</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nama Function *</Label><Input value={functionForm.name} onChange={(e) => setFunctionForm({ ...functionForm, name: e.target.value })} placeholder="singkat_kota" /></div>
            <div className="space-y-1.5"><Label>Deskripsi</Label><Input value={functionForm.description} onChange={(e) => setFunctionForm({ ...functionForm, description: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Parameter (pisah koma)</Label><Input value={functionForm.parameters} onChange={(e) => setFunctionForm({ ...functionForm, parameters: e.target.value })} placeholder="kabupaten, kecamatan" /></div>
            <div className="space-y-1.5"><Label>DSL Implementasi *</Label><Textarea rows={3} className="font-mono text-[12.5px]" value={functionForm.implementation} onChange={(e) => setFunctionForm({ ...functionForm, implementation: e.target.value })} placeholder="{{concat($1, ', ', $2)}}" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFunctionOpen(false)}>Batal</Button>
            <Button onClick={saveCustomFunction}>{editingFunction ? "Simpan" : "Buat"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
