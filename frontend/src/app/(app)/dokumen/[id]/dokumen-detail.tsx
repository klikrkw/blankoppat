"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, Pencil, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { downloadBlob, printText } from "@/lib/download";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTimeID } from "@/lib/format";
import type { DocumentItem } from "@/lib/types";

type DocWithRefs = DocumentItem & {
  template?: { name: string; version: number };
  transaksi?: { nomor_transaksi: string };
};

export default function DokumenDetailPage({ id }: { id: string }) {
  const [doc, setDoc] = useState<DocWithRefs | null>(null);
  const [text, setText] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listDocuments().then((r) => setDoc(r.data.find((d) => d.id === id) ?? null));
  }, [id]);

  useEffect(() => {
    api
      .getDocumentText(id)
      .then(setText)
      .catch(() => setText(""));
  }, [id]);

  if (!doc) {
    return (
      <div>
        <PageHeader title="Dokumen" description="Memuat data dokumen..." />
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const blob = await api.downloadDocument(doc.id);
      downloadBlob(blob, `${doc.document_number}.docx`);
      toast.success("Dokumen berhasil diunduh", {
        description: `${doc.document_number}.docx`,
      });
    } catch (e) {
      toast.error("Gagal mengunduh dokumen", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };

  const handleStartEdit = async () => {
    try {
      const editable = await api.getDocumentEditableText(doc.id);
      setDraft(editable.text);
    } catch {
      setDraft(text);
    }
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await api.updateDocumentContent(doc.id, draft);
      setText(res.text ?? draft);
      setEditing(false);
      toast.success("Dokumen disimpan", {
        description: "Format asli DOCX dipertahankan.",
      });
    } catch (e) {
      toast.error("Gagal menyimpan dokumen", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Detail Dokumen" description={doc.document_number}>
        <div className="flex gap-2">
          {editing ? (
            <Button onClick={handleSaveEdit} disabled={saving}>
              <Save className="size-4" /> {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleStartEdit}>
              <Pencil className="size-4" /> Edit
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => printText(doc.document_number, text || "Dokumen tidak memiliki isi.")}
          >
            <Printer className="size-4" /> Cetak
          </Button>
          <Button onClick={handleDownload} disabled={!doc.generated_file}>
            <Download className="size-4" /> Download DOCX
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border shadow-none lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-[15px]">{doc.title}</CardTitle>
              <StatusBadge status={doc.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-muted/30 p-4">
              {editing ? (
                <div className="space-y-2">
                  <Textarea
                    rows={20}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="font-sans text-[12.5px] leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Mode edit teks: font, tabel, dan spasi asli dipertahankan. Jangan menambah
                    atau menghapus baris.
                  </p>
                </div>
              ) : (
                <div className="max-h-[560px] overflow-y-auto rounded-lg border bg-card p-6 scrollbar-thin">
                  <pre className="font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground">
                    {text || "Memuat isi dokumen..."}
                  </pre>
                </div>
              )}
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Unduh file DOCX untuk membuka di Microsoft Word.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px]">Informasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[13px]">
            {[
              ["No. Dokumen", doc.document_number],
              ["Template", doc.template ? `${doc.template.name} (v${doc.template.version})` : "-"],
              ["Transaksi", doc.transaksi?.nomor_transaksi ?? "-"],
              ["Dibuat oleh", "Nur Ahmad Setiawan"],
              ["Dibuat pada", formatDateTimeID(doc.created_at)],
              ["Status", doc.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-right font-medium">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button asChild variant="ghost">
          <Link href="/dokumen">
            <ArrowLeft className="size-4" /> Kembali ke daftar dokumen
          </Link>
        </Button>
      </div>
    </div>
  );
}
