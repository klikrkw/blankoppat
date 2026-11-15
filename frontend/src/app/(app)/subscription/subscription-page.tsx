"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  FileUp,
  Loader2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { formatDateID, formatRupiah } from "@/lib/format";
import type {
  BankAccount,
  Invoice,
  Payment,
  SubscriptionPlan,
  UserSubscription,
} from "@/lib/types";

const ALLOWED_PROOF = ["image/jpeg", "image/png", "application/pdf"];

const FEATURES_BY_CODE: Record<string, string[]> = {
  FREE: ["5 dokumen / bulan", "Semua template standar", "Akses data e-KTP", "Dukungan komunitas"],
  BASIC: ["50 dokumen / bulan", "Semua template standar", "Custom field unlimited", "Prioritas dukungan"],
  PRO: ["200 dokumen / bulan", "Multi user (5 user)", "Custom function", "Audit log lengkap", "Prioritas dukungan"],
  BUSINESS: ["1.000 dokumen / tahun", "Multi user (20 user)", "Custom function", "Audit log lengkap", "Dedicated support"],
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.some((r) => r === "Super Admin" || r === "Admin") ?? false;

  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [history, setHistory] = useState<UserSubscription[]>([]);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [paymentList, setPaymentList] = useState<Payment[]>([]);
  const [bankList, setBankList] = useState<BankAccount[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const [payForm, setPayForm] = useState({
    sender_name: "",
    transfer_date: new Date().toISOString().slice(0, 10),
    bank_account_id: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [s, i, p, b] = await Promise.all([
      api.getSubscription(),
      api.getInvoices(),
      api.getPayments(),
      api.getBankAccounts(),
    ]);
    setSub(s.subscription);
    setHistory(s.history);
    setInvoiceList(i);
    setPaymentList(p);
    setBankList(b);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getSubscription(),
      api.getInvoices(),
      api.getPayments(),
      api.getBankAccounts(),
      api.listPlans(),
    ]).then(([s, i, p, b, pl]) => {
      if (!active) return;
      setSub(s.subscription);
      setHistory(s.history);
      setInvoiceList(i);
      setPaymentList(p);
      setBankList(b);
      setPlans(pl);
    });
    return () => {
      active = false;
    };
  }, []);

  const pct = sub
    ? Math.min((sub.document_used / sub.document_limit) * 100, 100)
    : 0;

  const handleChoose = async (plan: SubscriptionPlan) => {
    if (plan.is_free) {
      toast.info("Anda sudah menggunakan paket Free");
      return;
    }
    setCreatingInvoice(true);
    try {
      const inv = await api.createInvoice(plan.id);
      setCurrentInvoice(inv);
      setPayForm((f) => ({
        ...f,
        sender_name: user?.name ?? "",
        bank_account_id: bankList[0] ? String(bankList[0].id) : "",
      }));
      setProofFile(null);
      setInvoiceOpen(true);
    } catch (e) {
      toast.error("Gagal membuat invoice", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (!currentInvoice) return;
    if (!payForm.sender_name.trim()) {
      toast.error("Nama pengirim wajib diisi");
      return;
    }
    if (!proofFile) {
      toast.error("Upload bukti transfer terlebih dahulu (jpg, png, atau pdf)");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitPayment({
        invoice_id: currentInvoice.id,
        bank_account_id: Number(payForm.bank_account_id),
        amount: currentInvoice.amount,
        transfer_date: payForm.transfer_date,
        sender_name: payForm.sender_name,
        proof_file: proofFile.name,
      });
      toast.success("Bukti transfer terkirim", {
        description: "Pembayaran menunggu verifikasi admin.",
      });
      setInvoiceOpen(false);
      refresh();
    } catch (e) {
      toast.error("Gagal mengirim bukti", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (paymentId: string) => {
    const ok = await api.verifyPayment(paymentId);
    if (ok) {
      toast.success("Pembayaran diverifikasi", {
        description: "Subscription baru telah diaktifkan.",
      });
      refresh();
    } else {
      toast.error("Pembayaran tidak dapat diverifikasi");
    }
  };

  const handleReject = async (paymentId: string) => {
    const reason = window.prompt("Alasan penolakan pembayaran:");
    const ok = await api.rejectPayment(paymentId, reason ?? "");
    if (ok) {
      toast.info("Pembayaran ditolak");
      refresh();
    } else {
      toast.error("Pembayaran tidak dapat ditolak");
    }
  };

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Kelola paket langganan dan kuota dokumen Anda."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Paket Aktif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">{sub?.plan_name ?? "-"}</p>
              <StatusBadge status={sub?.status ?? "pending"} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12.5px]">
                <span className="text-muted-foreground">Kuota dokumen</span>
                <span className="font-semibold">
                  {sub?.document_used} / {sub?.document_limit}
                </span>
              </div>
              <Progress value={pct} className="h-2" />
              <p className="text-[11.5px] text-muted-foreground">
                Sisa {sub ? sub.document_limit - sub.document_used : 0} dokumen
              </p>
            </div>
            <div className="space-y-2 border-t pt-3 text-[12.5px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Periode</span>
                <span className="font-medium">
                  {sub ? `${formatDateID(sub.starts_at)} — ${formatDateID(sub.ends_at)}` : "-"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Perpanjangan otomatis</span>
                <span className="font-medium">{sub?.auto_renew ? "Aktif" : "Nonaktif"}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                document.getElementById("paket-section")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <Sparkles className="size-4" /> Upgrade Paket
            </Button>
          </CardContent>
        </Card>

        <Card className="border shadow-none lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Riwayat Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-[13px] font-semibold">{h.plan_name}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {formatDateID(h.starts_at)} — {formatDateID(h.ends_at)} · {h.document_used}/{h.document_limit} dokumen
                    </p>
                  </div>
                  <StatusBadge status={h.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div id="paket-section" className="mt-8">
        <h3 className="mb-3 text-[15px] font-bold tracking-tight">Pilih Paket</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans
            .filter((p) => p.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((p) => {
              const current = sub?.plan_id === p.id;
              const features = FEATURES_BY_CODE[p.code] ?? [];
              return (
                <Card
                  key={p.id}
                  className={cn(
                    "relative border shadow-none",
                    p.code === "PRO" && "border-primary ring-2 ring-primary/15"
                  )}
                >
                  {p.code === "PRO" && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      Populer
                    </Badge>
                  )}
                  <CardContent className="p-5">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-[12px] text-muted-foreground">{p.description}</p>
                    <p className="mt-3">
                      <span className="text-2xl font-bold tracking-tight">
                        {p.price === 0 ? "Rp0" : formatRupiah(p.price)}
                      </span>
                      <span className="text-[11.5px] text-muted-foreground">
                        / {p.billing_period === "monthly" ? "bulan" : "tahun"}
                      </span>
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-[12px]">
                          <Check className="size-3.5 shrink-0 text-emerald-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-4 w-full"
                      variant={current ? "secondary" : "default"}
                      disabled={current || creatingInvoice}
                      onClick={() => handleChoose(p)}
                    >
                      {creatingInvoice && <Loader2 className="animate-spin" />}
                      {current ? "Paket Saat Ini" : p.is_free ? "Gratis" : "Pilih Paket"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      <div className="mt-8">
        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">Invoice</TabsTrigger>
            <TabsTrigger value="payments">Pembayaran</TabsTrigger>
            <TabsTrigger value="bank">Rekening Bank</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            <Card className="border shadow-none">
              <CardContent className="divide-y p-0">
                {invoiceList.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <CreditCard className="size-4.5" />
                      </span>
                      <div>
                        <p className="font-mono text-[12.5px] font-medium">{inv.invoice_number}</p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {inv.plan_name} · {formatRupiah(inv.amount)} · jatuh tempo {formatDateID(inv.due_at)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={inv.status} />
                  </div>
                ))}
                {invoiceList.length === 0 && (
                  <p className="p-6 text-center text-[12.5px] text-muted-foreground">
                    Belum ada invoice.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card className="border shadow-none">
              <CardContent className="divide-y p-0">
                {paymentList.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                        <FileUp className="size-4.5" />
                      </span>
                      <div>
                        <p className="text-[12.5px] font-medium">
                          {p.sender_name} → {p.bank_name}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {formatRupiah(p.amount)} · {formatDateID(p.transfer_date)}
                          {p.proof_file ? ` · ${p.proof_file}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      {isAdmin && p.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600"
                            onClick={() => handleVerify(p.id)}
                          >
                            <CheckCircle2 className="size-3.5" /> Verifikasi
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => handleReject(p.id)}
                          >
                            <XCircle className="size-3.5" /> Tolak
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {paymentList.length === 0 && (
                  <p className="p-6 text-center text-[12.5px] text-muted-foreground">
                    Belum ada pembayaran.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bank" className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {bankList.map((b) => (
                <Card key={b.id} className="border shadow-none">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{b.bank_name} — {b.branch}</p>
                      <p className="font-mono text-[13px]">{b.account_number}</p>
                      <p className="text-[12px] text-muted-foreground">a.n. {b.account_name}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Invoice — {currentInvoice?.plan_name}</DialogTitle>
            <DialogDescription>
              Transfer sesuai nominal ke rekening di bawah, lalu upload bukti transfer.
            </DialogDescription>
          </DialogHeader>
          {currentInvoice && (
            <div className="space-y-3 py-1">
              <div className="rounded-xl border bg-muted/40 p-4 text-center">
                <p className="text-[11.5px] text-muted-foreground">
                  {currentInvoice.invoice_number} · Total Pembayaran
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight">
                  {formatRupiah(currentInvoice.amount)}
                </p>
                <p className="text-[11.5px] text-muted-foreground">
                  {currentInvoice.billing_period === "monthly" ? "per bulan" : "per tahun"} ·
                  jatuh tempo {formatDateID(currentInvoice.due_at)}
                </p>
              </div>

              {bankList.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-[12.5px] font-semibold">{b.bank_name}</p>
                    <p className="font-mono text-[13px]">{b.account_number}</p>
                    <p className="text-[11.5px] text-muted-foreground">a.n. {b.account_name}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(b.account_number);
                      toast.success("Nomor rekening disalin");
                    }}
                  >
                    Salin
                  </Button>
                </div>
              ))}

              <div className="space-y-3 rounded-xl border p-3">
                <p className="text-[12px] font-semibold">Kirim Bukti Transfer</p>
                <div className="space-y-1.5">
                  <Label>Rekening Tujuan</Label>
                  <Select
                    value={payForm.bank_account_id}
                    onValueChange={(v) => setPayForm((f) => ({ ...f, bank_account_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih rekening tujuan" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankList.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.bank_name} — {b.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nama Pengirim *</Label>
                  <Input
                    value={payForm.sender_name}
                    onChange={(e) => setPayForm((f) => ({ ...f, sender_name: e.target.value }))}
                    placeholder="Nama sesuai rekening pengirim"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal Transfer</Label>
                  <Input
                    type="date"
                    value={payForm.transfer_date}
                    onChange={(e) => setPayForm((f) => ({ ...f, transfer_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Bukti Transfer *</Label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file && !ALLOWED_PROOF.includes(file.type)) {
                        toast.error("Format tidak didukung", {
                          description: "Gunakan JPG, PNG, atau PDF (maks 5 MB).",
                        });
                        e.target.value = "";
                        return;
                      }
                      setProofFile(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      "flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed py-4 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary",
                      proofFile && "border-emerald-500/50 text-emerald-600"
                    )}
                  >
                    <FileUp className="size-5" />
                    <span className="text-[12px] font-medium">
                      {proofFile ? proofFile.name : "Pilih file (jpg, png, pdf)"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitPayment} disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Mengirim..." : "Kirim Bukti Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
