"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FileUp,
  Gauge as GaugeIcon,
  IdCard,
  LandPlot,
  LayoutTemplate,
  Plus,
  ScrollText,
  Sparkles,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { formatDateID, timeAgo } from "@/lib/format";
import type { AuditLog, DocumentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DashboardData {
  total_templates: number;
  active_templates: number;
  documents_today: number;
  documents_month: number;
  active_users: number;
  total_ektp: number;
  total_obyek: number;
  total_transaksi: number;
  recent_activity: AuditLog[];
  recent_documents: DocumentItem[];
  subscription: {
    plan_name: string;
    document_used: number;
    document_limit: number;
    ends_at: string | null;
    status: string;
  };
}

const ACTION_TONES: Record<string, string> = {
  LOGIN: "bg-sky-500/10 text-sky-600",
  GENERATE_DOCUMENT: "bg-emerald-500/10 text-emerald-600",
  CREATE_TEMPLATE: "bg-violet-500/10 text-violet-600",
  UPDATE_TEMPLATE: "bg-violet-500/10 text-violet-600",
  CREATE_TRANSACTION: "bg-amber-500/10 text-amber-600",
  CREATE_CUSTOM_FIELD: "bg-rose-500/10 text-rose-600",
  DOWNLOAD_DOCUMENT: "bg-primary/10 text-primary",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.getDashboard().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const quotaPct = Math.min(
    (data.subscription.document_used / data.subscription.document_limit) * 100,
    100
  );

  return (
    <div className="space-y-6">
      <div className="gradient-brand relative overflow-hidden rounded-2xl p-6 text-white md:p-8">
        <div className="absolute -top-16 -right-10 size-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 right-40 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[12px] font-medium text-white/70">
              {formatDateID(new Date())}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">
              Selamat datang, {user?.name?.split(" ")[0]}
            </h2>
            <p className="mt-1 max-w-lg text-[13px] text-white/80">
              Buat blanko akta PPAT otomatis — pilih transaksi, isi data, dan
              generate dokumen Word dalam hitungan detik.
            </p>
          </div>
          <Button
            asChild
            size="lg"
            className="bg-white text-primary shadow-lg hover:bg-white/90"
          >
            <Link href="/dokumen/baru">
              <Plus className="size-4" /> Buat Dokumen Baru
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={LayoutTemplate} label="Template Aktif" value={data.active_templates} hint={`dari ${data.total_templates} template`} tone="primary" />
        <StatCard icon={FileText} label="Dokumen Bulan Ini" value={data.documents_month} hint={`${data.documents_today} hari ini`} tone="emerald" />
        <StatCard icon={ScrollText} label="Transaksi" value={data.total_transaksi} hint="total transaksi" tone="amber" />
        <StatCard icon={IdCard} label="Data e-KTP" value={data.total_ektp} hint="data pihak" tone="violet" />
        <StatCard icon={LandPlot} label="Objek Tanah" value={data.total_obyek} hint="data objek" tone="sky" />
        <StatCard icon={Users} label="User Aktif" value={data.active_users} hint="pengguna" tone="rose" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="border shadow-none">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-[15px]">Dokumen Terakhir</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dokumen">
                  Lihat semua <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              {data.recent_documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Belum ada dokumen"
                  description="Mulai buat dokumen pertama Anda."
                />
              ) : (
                <div className="divide-y">
                  {data.recent_documents.map((d) => (
                    <Link
                      key={d.id}
                      href={`/dokumen/${d.id}`}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">
                          {d.title}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {d.document_number} · {timeAgo(d.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={d.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Aktivitas Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-2">
              <div className="space-y-1">
                {data.recent_activity.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 rounded-lg px-4 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        ACTION_TONES[a.action] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      <GaugeIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">
                        <span className="font-semibold">{a.user_name}</span>{" "}
                        <span className="text-muted-foreground">{a.detail}</span>
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        {a.action} · {timeAgo(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold">
                  Paket {data.subscription.plan_name}
                </p>
                <StatusBadge status="active" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="text-muted-foreground">Kuota dokumen</span>
                  <span className="font-semibold">
                    {data.subscription.document_used} / {data.subscription.document_limit}
                  </span>
                </div>
                <Progress value={quotaPct} className="h-2" />
                <p className="text-[11.5px] text-muted-foreground">
                  Sisa {data.subscription.document_limit - data.subscription.document_used} dokumen · berakhir{" "}
                  {data.subscription.ends_at ? formatDateID(data.subscription.ends_at) : "-"}
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/subscription">
                  <Sparkles className="size-4" /> Upgrade Paket
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-4">
                <Link href="/dokumen/baru">
                  <Plus className="size-5" />
                  <span className="text-xs">Dokumen Baru</span>
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-4">
                <Link href="/template">
                  <FileUp className="size-5" />
                  <span className="text-xs">Upload Template</span>
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-4">
                <Link href="/data/ektp">
                  <IdCard className="size-5" />
                  <span className="text-xs">Cari e-KTP</span>
                </Link>
              </Button>
              <Button asChild variant="secondary" className="h-auto flex-col gap-1.5 py-4">
                <Link href="/dynamic-field">
                  <Plus className="size-5" />
                  <span className="text-xs">Custom Field</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
