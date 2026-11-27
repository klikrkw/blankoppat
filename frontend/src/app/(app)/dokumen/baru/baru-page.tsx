"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Lock,
  Plus,
  Search,
  Trash2,
  UserRound,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { formatJenisSertipikat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { transaksiFormSchema, type TransaksiFormValues } from "@/lib/schemas";
import {
  formatDate,
  formatNumber,
  renderTemplate,
  terbilang,
} from "@/lib/template-engine";
import type {
  CustomField,
  CustomFieldGroup,
  EktpRecord,
  Item,
  Uraian,
  JenisTransaksi,
  Obyek,
  SuratCollectionItem,
  Pejabat,
} from "@/lib/types";

const STEPS = [
  "Jenis Transaksi",
  "Data Transaksi",
  "Objek Tanah",
  "Pihak",
  "Pejabat",
  "Sections",
  "Custom Field",
  "Pilih Surat",
  "Preview",
];

interface PihakRole {
  role: string;
  sebutan: string;
  pihak_role_id?: number;
}

interface PihakDraft {
  id: string;
  roles: PihakRole[];
  ektp: EktpRecord[];
  parent: string | null;
}

interface GeneratedDoc {
  id: string;
  document_number: string;
  title: string;
}

type FieldWithOptions = CustomField & { options?: { value: string; label: string }[] };

export default function DokumenBaruPage() {
  const [step, setStep] = useState(0);
  const [jenisList, setJenisList] = useState<(JenisTransaksi & { surat_count: number })[]>([]);
  const [jenisId, setJenisId] = useState<number | null>(null);

  const [txForm, setTxForm] = useState<TransaksiFormValues>(() => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    return {
      nomor_transaksi: "",
      tanggal_transaksi: today,
      judul: "",
      keterangan: "",
    };
  });
  const [txErrors, setTxErrors] = useState<Record<string, string>>({});

  const [obyekList, setObyekList] = useState<Obyek[]>([]);
  const [obyekSearch, setObyekSearch] = useState("");
  const [obyekId, setObyekId] = useState<number | null>(null);
  const [obyekDetail, setObyekDetail] = useState<Obyek | null>(null);

  const [pihakList, setPihakList] = useState<PihakDraft[]>([
    { id: "p1", roles: [{ role: "PELEPAS", sebutan: "PELEPAS HAK" }], ektp: [], parent: null },
    { id: "p2", roles: [{ role: "PENERIMA", sebutan: "PENERIMA HAK" }], ektp: [], parent: null },
  ]);
  const [pihakRoles, setPihakRoles] = useState<{ id: number; role: string; sebutan: string }[]>([]);
  const [sections, setSections] = useState<
    {
      item_id: number | null;
      uraian_id: number | null;
      pihak: string | null;
      detail: string;
      short_text: string;
    }[]
  >([]);
  const [itemList, setItemList] = useState<Item[]>([]);
  const [uraianList, setUraianList] = useState<Uraian[]>([]);
  const [gelarMap, setGelarMap] = useState<Record<string, string>>({});
  const [pejabatResults, setPejabatResults] = useState<Pejabat[]>([]);
  const [selectedPejabat, setSelectedPejabat] = useState<Pejabat[]>([]);
  const [pejabatSearch, setPejabatSearch] = useState("");
  const [ektpSearch, setEktpSearch] = useState("");
  const [ektpResults, setEktpResults] = useState<EktpRecord[]>([]);
  const [ektpForPihak, setEktpForPihak] = useState<string | null>(null);

  const [fieldGroups, setFieldGroups] = useState<
    (CustomFieldGroup & { fields: FieldWithOptions[] })[]
  >([]);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});

  const [collection, setCollection] = useState<SuratCollectionItem[]>([]);
  const [selectedSurat, setSelectedSurat] = useState<string[]>([]);
  const [contentByTemplate, setContentByTemplate] = useState<Record<number, string>>({});

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedDoc[]>([]);

  useEffect(() => {
    api.nextTransaksiNumber().then((nomor) => {
      setTxForm((f) => (f.nomor_transaksi ? f : { ...f, nomor_transaksi: nomor }));
    });
    api.listJenistransaksi().then(setJenisList);
    api.listPihakRoles().then(setPihakRoles);
    api.listItems("", 1, 1000).then((r) => setItemList(r.data));
    api.listUraian("", 1, 1000).then((r) => setUraianList(r.data));
    api
      .listGelar("", 1, 1000)
      .then((r) =>
        setGelarMap(
          Object.fromEntries(r.data.map((g) => [g.singkatan, g.kepanjangan]))
        )
      )
      .catch(() => setGelarMap({}));
    api.listCustomFieldGroups().then((groups) => {
      setFieldGroups(groups);
      const defaults: Record<string, unknown> = {};
      for (const g of groups) {
        for (const f of g.fields) {
          if (f.default_value !== null && f.default_value !== undefined) {
            defaults[f.name] = f.default_value;
          }
        }
      }
      setCustomValues((c) => ({ ...defaults, ...c }));
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      api.listEktp(ektpSearch, 1, 6).then((r) => setEktpResults(r.data));
    }, 250);
    return () => clearTimeout(t);
  }, [ektpSearch]);

  const objectWilayahId =
    obyekDetail?.wilayah_id ?? obyekDetail?.wilayah?.id ?? null;

  useEffect(() => {
    if (step !== 4) return;
    if (!objectWilayahId) return;
    const t = setTimeout(() => {
      api
        .listPejabat(pejabatSearch, 1, 50, objectWilayahId)
        .then((r) => setPejabatResults(r.data))
        .catch(() => setPejabatResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [pejabatSearch, step, objectWilayahId]);

  const pathname = usePathname();
  const previousPath = useRef(pathname);

  const resetWizard = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    setStep(0);
    setJenisId(null);
    setTxErrors({});
    setTxForm({ nomor_transaksi: "", tanggal_transaksi: today, judul: "", keterangan: "" });
    setObyekId(null);
    setObyekDetail(null);
    setObyekSearch("");
    setObyekList([]);
    setPihakList([
      { id: "p1", roles: [{ role: "PELEPAS", sebutan: "PELEPAS HAK" }], ektp: [], parent: null },
      { id: "p2", roles: [{ role: "PENERIMA", sebutan: "PENERIMA HAK" }], ektp: [], parent: null },
    ]);
    setSections([]);
    setEktpSearch("");
    setEktpForPihak(null);
    setSelectedPejabat([]);
    setPejabatSearch("");
    setPejabatResults([]);
    setSelectedSurat([]);
    setCollection([]);
    setContentByTemplate({});
    setGenerated([]);
    setGenerating(false);

    const defaults: Record<string, unknown> = {};
    for (const group of fieldGroups) {
      for (const field of group.fields) {
        if (field.default_value !== null && field.default_value !== undefined) {
          defaults[field.name] = field.default_value;
        }
      }
    }
    setCustomValues(defaults);

    api.nextTransaksiNumber().then((nomor) => setTxForm((f) => ({ ...f, nomor_transaksi: nomor })));
  };

  // Mulai form kosong setiap kali halaman ini dibuka.
  useEffect(() => {
    const id = setTimeout(resetWizard, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pathname === "/dokumen/baru" && previousPath.current !== pathname) {
      const id = setTimeout(resetWizard, 0);
      previousPath.current = pathname;
      return () => clearTimeout(id);
    }
    previousPath.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const t = setTimeout(() => {
      api.listObyek(obyekSearch, 1, 8).then((r) => setObyekList(r.data));
    }, 250);
    return () => clearTimeout(t);
  }, [obyekSearch]);

  useEffect(() => {
    if (obyekId === null) return;
    api.getObyek(obyekId).then((o) => setObyekDetail(o ?? null));
  }, [obyekId]);

  useEffect(() => {
    if (jenisId === null) return;
    api.getSuratCollection(jenisId).then((c) => {
      setCollection(c);
      // Surat wajib, default terpilih, atau template berstatus active otomatis dipilih.
      setSelectedSurat(
        c
          .filter((s) => s.wajib || s.default_selected || s.template?.status === "active")
          .map((s) => s.id)
      );
    });
  }, [jenisId]);

  useEffect(() => {
    if (collection.length === 0) return;
    let cancelled = false;
    (async () => {
      const cache: Record<number, string> = {};
      for (const s of collection) {
        if (s.template_id == null) continue;
        try {
          cache[s.template_id] = await api.getTemplateContent(s.template_id);
        } catch {
          // ignore
        }
      }
      if (!cancelled) setContentByTemplate((c) => ({ ...c, ...cache }));
    })();
    return () => {
      cancelled = true;
    };
  }, [collection]);

  const activeCustomFields = useMemo(
    () =>
      fieldGroups
        .flatMap((g) => g.fields)
        .filter((f) => f.display)
        .sort((a, b) => a.sort_order - b.sort_order),
    [fieldGroups]
  );

  const penjual = pihakList
    .filter((p) => p.roles.some((r) => r.role === "PENJUAL" || r.role === "PELEPAS"))
    .flatMap((p) => p.ektp);
  const pembeli = pihakList
    .filter((p) => p.roles.some((r) => r.role === "PEMBELI" || r.role === "PENERIMA"))
    .flatMap((p) => p.ektp);
  const saksi = pihakList
    .filter((p) => p.roles.some((r) => r.role === "SAKSI"))
    .flatMap((p) => p.ektp);

  const peranContext = useMemo(() => {
    const map: Record<string, Record<string, unknown>[]> = {};

    // Semua role per orang/e-KTP, meskipun role dipasang pada baris pihak
    // berbeda. Dipakai untuk `p.roles contains 'WALI'`.
    const rolesByEktp = new Map<number, string[]>();
    for (const draft of pihakList) {
      for (const r of draft.roles) {
        for (const e of draft.ektp) {
          const roles = rolesByEktp.get(e.id) ?? [];
          if (!roles.includes(r.role)) roles.push(r.role);
          rolesByEktp.set(e.id, roles);
        }
      }
    }

    // Child = daftar ORANG (satu e-KTP satu entri), sama seperti backend.
    const childPersons = (
      draft: PihakDraft,
      depth = 0,
      visited: Set<string> = new Set()
    ): Record<string, unknown>[] => {
      if (depth >= 5) return [];
      const seen = new Set(visited).add(draft.id);
      const result: Record<string, unknown>[] = [];
      const index = new Map<number, Record<string, unknown>>();
      for (const child of pihakList.filter((x) => x.parent === draft.id && !seen.has(x.id))) {
        const role = child.roles[0]?.role ?? "";
        const sebutan = child.roles[0]?.sebutan ?? "";
        for (const e of child.ektp) {
          const existing = index.get(e.id);
          if (existing) {
            const roles = existing.roles as string[];
            if (!roles.includes(role)) roles.push(role);
            continue;
          }
          const entry: Record<string, unknown> = {
            ...e,
            role,
            sebutan,
            party_id: child.id,
            roles: rolesByEktp.get(e.id) ?? [role],
            persons: child.ektp,
            has_parent: true,
            has_children: false,
          };
          const kids = childPersons(child, depth + 1, seen);
          if (kids.length) {
            entry.children = kids;
            entry.has_children = true;
          }
          index.set(e.id, entry);
          result.push(entry);
        }
      }
      return result;
    };

    const summary = (
      draft: PihakDraft,
      depth = 0,
      visited: Set<string> = new Set()
    ): Record<string, unknown> => {
      const first = draft.ektp[0] ?? ({} as EktpRecord);
      const obj: Record<string, unknown> = {
        ...first,
        party_id: draft.id,
        role: draft.roles[0]?.role ?? "",
        roles: draft.roles.map((r) => r.role),
        sebutan: draft.roles[0]?.sebutan ?? "",
        persons: draft.ektp,
        has_parent: false,
        has_children: false,
      };
      if (depth >= 5) return obj;
      const seen = new Set(visited).add(draft.id);
      const kids = childPersons(draft, depth + 1, seen);
      if (kids.length) {
        obj.children = kids;
        obj.has_children = true;
      }
      const parent = draft.parent ? pihakList.find((x) => x.id === draft.parent) : undefined;
      if (parent && !seen.has(parent.id)) {
        obj.parent = summary(parent, depth + 1, seen);
        obj.has_parent = true;
      }
      return obj;
    };
    for (const p of pihakList) {
      const parent = p.parent ? pihakList.find((x) => x.id === p.parent) : undefined;
      const parentObj = parent ? summary(parent) : {};
      const childrenObj = childPersons(p);
      for (const r of p.roles) {
        for (const e of p.ektp) {
          (map[r.role] ||= []).push({
            ...e,
            role: r.role,
            roles: rolesByEktp.get(e.id) ?? [r.role],
            sebutan: r.sebutan,
            parent: parentObj,
            children: childrenObj,
            has_parent: Boolean(parent),
            has_children: childrenObj.length > 0,
          });
        }
      }
    }
    return map;
  }, [pihakList]);

  const uraianContext = useMemo(() => {
    const decode = (value: string) =>
      value.split("\\n").join("\n").split("\\t").join("\t");
    const map: Record<string, string> = {};
    for (const u of uraianList) {
      if ((u.parameters ?? []).length > 0) continue;
      const isi = decode(u.isi_uraian ?? "");
      const slug = u.nama_uraian
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      if (slug && map[slug] === undefined) map[slug] = isi;
      map[u.nama_uraian] = isi;
    }
    return map;
  }, [uraianList]);

  const previewContext = useMemo(() => {
    const values = { ...customValues };
    Object.assign(values, { nomor_akta: txForm.nomor_transaksi, tanggal_akta: txForm.tanggal_transaksi });
    const sectionRows = sections
      .filter((sec) => sec.item_id)
      .map((sec) => {
        const party = sec.pihak ? pihakList.find((x) => x.id === sec.pihak) : undefined;
        return {
          item_id: sec.item_id,
          nama_item: itemList.find((i) => i.id === sec.item_id)?.nama_item ?? "",
          uraian_id: sec.uraian_id,
          nama_uraian: uraianList.find((u) => u.id === sec.uraian_id)?.nama_uraian ?? "",
          pihak_id: sec.pihak,
          nama_pihak: party?.roles[0]?.role ?? "",
          detail: sec.detail,
          short_text: sec.short_text,
        };
      });
    const byName: Record<string, string> = {};
    const byNameShort: Record<string, string> = {};
    const byParty: Record<string, Record<string, string>> = {};
    const byPartyShort: Record<string, Record<string, string>> = {};
    for (const row of sectionRows) {
      if (!row.nama_item) continue;
      if (!row.pihak_id) {
        byName[row.nama_item] = row.detail;
        byNameShort[row.nama_item] = row.short_text || row.detail;
      }
      const role = (row.nama_pihak || "").trim();
      if (!role) continue;
      const slug = role
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      for (const key of [role, slug]) {
        (byParty[key] ||= {})[row.nama_item] = row.detail;
        (byPartyShort[key] ||= {})[row.nama_item] = row.short_text || row.detail;
      }
    }
    return {
      transaksi: txForm,
      peran: peranContext,
      pihak: [
        ...penjual.map((e) => ({ role: "PENJUAL", ...e })),
        ...pembeli.map((e) => ({ role: "PEMBELI", ...e })),
      ],
      penjual,
      pembeli,
      saksi,
      sections: sectionRows,
      sections_by_name: byName,
      sections_by_name_short: byNameShort,
      sections_by_party: byParty,
      sections_by_party_short: byPartyShort,
      obyek: obyekDetail ?? {},
      jenishak: (obyekDetail as Obyek & { jenishak?: unknown })?.jenishak ?? {},
      letak: (obyekDetail as Obyek & { wilayah?: unknown })?.wilayah ?? {},
      wilayah: (obyekDetail as Obyek & { wilayah?: unknown })?.wilayah ?? {},
      custom: values,
      uraian: uraianContext,
      gelar: gelarMap,
      pejabat: selectedPejabat,
      pejabat_by_role: selectedPejabat.reduce<Record<string, Pejabat[]>>(
        (acc, p) => {
          (acc[p.role_name] ||= []).push(p);
          return acc;
        },
        {}
      ),
      system: {
        company_name: "PPAT & Notaris Ahmad Fauzi, S.H., M.Kn.",
      },
    };
  }, [
    customValues,
    txForm,
    penjual,
    pembeli,
    saksi,
    obyekDetail,
    peranContext,
    uraianContext,
    sections,
    pihakList,
    itemList,
    uraianList,
    gelarMap,
    selectedPejabat,
  ]);

  const previewDoc = useMemo(() => {
    const suratId = selectedSurat[0];
    const s = collection.find((x) => x.id === suratId);
    if (!s || s.template_id == null) return null;
    const content = contentByTemplate[s.template_id];
    if (!content) return null;
    return { surat: s, text: renderTemplate(content, previewContext) };
  }, [selectedSurat, collection, contentByTemplate, previewContext]);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (jenisId === null) {
        toast.error("Pilih jenis transaksi terlebih dahulu", {
          description: "Klik salah satu kartu jenis transaksi untuk melanjutkan.",
        });
        return false;
      }
    }
    if (step === 1) {
      const parsed = transaksiFormSchema.safeParse(txForm);
      if (!parsed.success) {
        const errs: Record<string, string> = {};
        parsed.error.issues.forEach((i) => {
          errs[i.path[0] as string] = i.message;
        });
        setTxErrors(errs);
        toast.error("Periksa kembali data transaksi", {
          description: parsed.error.issues[0]?.message,
        });
        return false;
      }
      setTxErrors({});
    }
    if (step === 2) {
      if (obyekId === null) {
        toast.error("Pilih objek tanah", {
          description: "Klik salah satu kartu objek tanah untuk melanjutkan.",
        });
        return false;
      }
    }
    if (step === 3) {
      const hasPihak = pihakList.some((p) => p.ektp.length > 0);
      if (!hasPihak) {
        toast.error("Tambahkan minimal satu orang ke pihak", {
          description: "Klik 'Pilih dari e-KTP' lalu pilih nama dari hasil pencarian.",
        });
        return false;
      }
      setCustomValues((c) => ({
        ...c,
        nomor_akta:
          c.nomor_akta === undefined || c.nomor_akta === ""
            ? txForm.nomor_transaksi
            : c.nomor_akta,
        tanggal_akta:
          c.tanggal_akta === undefined || c.tanggal_akta === ""
            ? txForm.tanggal_transaksi
            : c.tanggal_akta,
      }));
    }
    if (step === 6) {
      const missing = activeCustomFields
        .filter((f) => {
          if (!f.required) return false;
          const v = customValues[f.name];
          return v === undefined || v === null || v === "";
        })
        .map((f) => f.field_title);
      if (missing.length > 0) {
        toast.error("Custom field wajib belum lengkap", {
          description: `Yang kurang: ${missing.join(", ")}`,
        });
        return false;
      }
    }
    if (step === 7) {
      if (selectedSurat.length === 0) {
        toast.error("Pilih minimal satu surat");
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const addSection = () =>
    setSections((list) => [
      ...list,
      { item_id: null, uraian_id: null, pihak: null, detail: "", short_text: "" },
    ]);

  const updateSection = (
    index: number,
    patch: Partial<{
      item_id: number | null;
      uraian_id: number | null;
      pihak: string | null;
      detail: string;
      short_text: string;
    }>
  ) =>
    setSections((list) => list.map((sec, i) => (i === index ? { ...sec, ...patch } : sec)));

  const addPihak = () => {
    setPihakList((p) => [
      ...p,
      { id: `p${Date.now()}`, roles: [{ role: "SAKSI", sebutan: "SAKSI" }], ektp: [], parent: null },
    ]);
  };

  const removePihak = (id: string) => {
    setPihakList((p) =>
      p.filter((x) => x.id !== id).map((x) => (x.parent === id ? { ...x, parent: null } : x))
    );
  };

  const partyLabel = (p: PihakDraft) =>
    `${p.roles.map((r) => r.role).join("/") || "Pihak"}${
      p.ektp[0] ? ` — ${p.ektp[0].nama}` : ""
    }`;

  const isPartyDescendant = (candidateId: string, partyId: string): boolean => {
    const seen = new Set<string>();
    let current = pihakList.find((x) => x.id === candidateId);
    while (current?.parent) {
      if (current.parent === partyId) return true;
      if (seen.has(current.id)) break;
      seen.add(current.id);
      current = pihakList.find((x) => x.id === current!.parent);
    }
    return false;
  };

  const firstRoleKey = (draftId: string) => {
    const draft = pihakList.find((x) => x.id === draftId);
    return draft && draft.roles[0] ? `${draft.id}:0` : "";
  };

  const addEktpToPihak = (pihakId: string, record: EktpRecord) => {
    setPihakList((p) =>
      p.map((x) =>
        x.id === pihakId && !x.ektp.some((e) => e.id === record.id)
          ? { ...x, ektp: [...x.ektp, record] }
          : x
      )
    );
    setEktpForPihak(null);
  };

  const handleGenerate = async () => {
    if (obyekId === null) return;
    setGenerating(true);
    try {
      const createdTx = await api.createTransaksi({
        jenistransaksi_id: jenisId!,
        judul: txForm.judul,
        tanggal_transaksi: txForm.tanggal_transaksi,
        obyek_id: obyekId,
        keterangan: txForm.keterangan ?? "",
        nomor_transaksi: txForm.nomor_transaksi,
        pihak: pihakList
          .filter((p) => p.ektp.length > 0)
          .flatMap((p) => {
            const parentKey = p.parent ? firstRoleKey(p.parent) : "";
            return p.roles.map((r, ri) => ({
              role: r.role,
              sebutan: r.sebutan,
              pihak_role_id: r.pihak_role_id,
              ektp_ids: p.ektp.map((e) => e.id),
              key: `${p.id}:${ri}`,
              parent_key: parentKey,
            }));
          }),
        sections: sections
          .filter((sec) => sec.item_id)
          .map((sec) => ({
            item_id: sec.item_id as number,
            uraian_id: sec.uraian_id,
            pihak_key: sec.pihak ? `${sec.pihak}:0` : "",
            detail: sec.detail,
            short_text: sec.short_text,
          })),
        pejabat_ids: selectedPejabat.map((p) => p.id),
      });
      const docs = await api.generateDocuments({
        transaksi_id: createdTx.id,
        surat_ids: selectedSurat,
        custom_values: customValues,
      });
      const created: GeneratedDoc[] = docs.map((d) => ({
        id: d.id,
        document_number: d.document_number,
        title: d.title,
      }));
      setGenerated(created);
      if (created.length > 0) {
        try {
          const blob = await api.downloadDocument(created[0].id);
          downloadBlob(blob, `${created[0].document_number}.docx`);
          toast.success(`${created.length} dokumen berhasil digenerate dan diunduh`, {
            description: created.map((d) => d.document_number).join(", "),
          });
        } catch {
          toast.success(`${created.length} dokumen berhasil digenerate`, {
            description: "Gunakan tombol Unduh di bawah untuk mengunduh.",
          });
        }
      }
    } catch (e) {
      toast.error("Gagal generate dokumen", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadGenerated = async (doc: GeneratedDoc) => {
    try {
      const blob = await api.downloadDocument(doc.id);
      downloadBlob(blob, `${doc.document_number}.docx`);
      toast.success("Dokumen diunduh", { description: `${doc.document_number}.docx` });
    } catch {
      toast.error("Gagal mengunduh dokumen");
    }
  };

  return (
    <div>
      <PageHeader
        title="Dokumen Baru"
        description="Ikuti langkah-langkah berikut untuk membuat dokumen PPAT."
      />

      <div className="mb-6 overflow-x-auto pb-1">
        <ol className="flex min-w-max items-center gap-1.5">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5">
              <button
                onClick={() => i < step && setStep(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  i === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i < step
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : "border-border text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10.5px] font-bold",
                    i === step
                      ? "bg-white/20"
                      : i < step
                        ? "bg-emerald-500/15"
                        : "bg-muted"
                  )}
                >
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" />}
            </li>
          ))}
        </ol>
      </div>

      {/* STEP 0 — Jenis Transaksi */}
      {step === 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jenisList.map((j) => (
            <button
              key={j.id}
              onClick={() => setJenisId(j.id)}
              className={cn(
                "rounded-xl border bg-card p-5 text-left transition-all hover:border-primary/50 hover:shadow-sm",
                jenisId === j.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    jenisId === j.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <FileText className="size-5" />
                </span>
                {jenisId === j.id && <CheckCircle2 className="size-5 text-primary" />}
              </div>
              <p className="mt-3 font-semibold">{j.nama_jenistransaksi}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {j.surat_count} surat tersedia
              </p>
            </button>
          ))}
        </div>
      )}

      {/* STEP 1 — Data Transaksi */}
      {step === 1 && (
        <Card className="max-w-2xl border shadow-none">
          <CardHeader>
            <CardTitle className="text-[15px]">Data Transaksi</CardTitle>
            <CardDescription>Isi informasi dasar transaksi.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nomor">Nomor Transaksi *</Label>
              <Input
                id="nomor"
                value={txForm.nomor_transaksi}
                onChange={(e) => setTxForm({ ...txForm, nomor_transaksi: e.target.value })}
                placeholder="01/JB/2026"
              />
              {txErrors.nomor_transaksi && (
                <p className="text-[11.5px] text-destructive">{txErrors.nomor_transaksi}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tanggal">Tanggal Transaksi *</Label>
              <Input
                id="tanggal"
                type="date"
                value={txForm.tanggal_transaksi}
                onChange={(e) => setTxForm({ ...txForm, tanggal_transaksi: e.target.value })}
              />
              {txErrors.tanggal_transaksi && (
                <p className="text-[11.5px] text-destructive">{txErrors.tanggal_transaksi}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="judul">Judul Transaksi *</Label>
              <Input
                id="judul"
                value={txForm.judul}
                onChange={(e) => setTxForm({ ...txForm, judul: e.target.value })}
                placeholder="Contoh: Jual Beli Tanah Agus - Budi"
              />
              {txErrors.judul && (
                <p className="text-[11.5px] text-destructive">{txErrors.judul}</p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ket">Keterangan</Label>
              <Textarea
                id="ket"
                rows={3}
                value={txForm.keterangan}
                onChange={(e) => setTxForm({ ...txForm, keterangan: e.target.value })}
                placeholder="Catatan tambahan (opsional)"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 — Objek */}
      {step === 2 && (
        <div>
          <div className="relative mb-4 max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={obyekSearch}
              onChange={(e) => setObyekSearch(e.target.value)}
              placeholder="Cari nomor hak, NIB, persil, atau nama..."
              className="pl-9"
            />
          </div>
          {obyekList.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Objek tidak ditemukan"
              description="Coba kata kunci lain. Jika masih kosong, isi data objek di database."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {obyekList.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setObyekId(o.id);
                    setSelectedPejabat([]);
                    setPejabatResults([]);
                  }}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm",
                    obyekId === o.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[12px] text-muted-foreground">
                        {(o as Obyek & { jenishak?: { nama_jenishak: string } }).jenishak?.nama_jenishak ?? "-"} · {formatJenisSertipikat(o.jenis_sertipikat)}
                      </p>
                      <p className="mt-0.5 font-semibold">Nomor Hak: {o.nomor_hak}</p>
                      <p className="text-[12.5px] text-muted-foreground">
                        Luas {formatNumber(o.luas_tanah)} m² · NIB {o.nib}
                      </p>
                      <p className="mt-1 text-[12.5px]">
                        Desa {(o as Obyek & { wilayah?: { desa?: string; kecamatan?: string; kabupaten?: string } }).wilayah?.desa ?? "-"} · Kec.{" "}
                        {(o as Obyek & { wilayah?: { kecamatan?: string } }).wilayah?.kecamatan ?? "-"} ·{" "}
                        {(o as Obyek & { wilayah?: { kabupaten?: string } }).wilayah?.kabupaten ?? "-"}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        a.n. {o.atas_nama}
                      </p>
                    </div>
                    {obyekId === o.id && <CheckCircle2 className="size-5 shrink-0 text-primary" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 3 — Pihak */}
      {step === 3 && (
        <div className="space-y-4">
          {pihakList.map((p) => (
            <Card key={p.id} className="border shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Label>Peran Pihak</Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.roles.map((roleItem, roleIndex) => (
                        <div key={`${roleItem.role}-${roleIndex}`} className="flex items-center gap-1 rounded-md border px-1.5 py-1">
                          <Select
                            value={roleItem.role}
                            onValueChange={(v) => {
                              const r = pihakRoles.find((x) => x.role === v);
                              setPihakList((list) => list.map((x) =>
                                x.id === p.id
                                  ? { ...x, roles: x.roles.map((item, i) => i === roleIndex ? { role: v, sebutan: r?.sebutan ?? item.sebutan, pihak_role_id: r?.id } : item) }
                                  : x
                              ));
                            }}
                          >
                            <SelectTrigger className="h-7 border-0 px-1 text-[12px] shadow-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {pihakRoles.map((r) => (
                                <SelectItem key={r.id} value={r.role}>{r.role} — {r.sebutan}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {p.roles.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setPihakList((list) => list.map((x) => x.id === p.id ? { ...x, roles: x.roles.filter((_, i) => i !== roleIndex) } : x))}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Hapus peran"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setPihakList((list) => list.map((x) => x.id === p.id ? { ...x, roles: [...x.roles, { role: "SAKSI", sebutan: "SAKSI" }] } : x))}
                      >
                        <Plus className="size-3.5" /> Peran
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <Button
                      variant="outline"
                      className="mt-1.5 w-full justify-start sm:mt-6"
                      onClick={() => setEktpForPihak(ektpForPihak === p.id ? null : p.id)}
                    >
                      <UserRound className="size-4" /> Pilih dari e-KTP
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="self-end text-muted-foreground hover:text-destructive"
                    disabled={pihakList.length <= 1}
                    onClick={() => removePihak(p.id)}
                    aria-label="Hapus pihak"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="mt-3 max-w-md space-y-1.5">
                  <Label className="text-[12px]">Induk Pihak (parent)</Label>
                  <Select
                    value={p.parent ?? "none"}
                    onValueChange={(v) =>
                      setPihakList((list) =>
                        list.map((x) =>
                          x.id === p.id ? { ...x, parent: v === "none" ? null : v } : x
                        )
                      )
                    }
                  >
                    <SelectTrigger className="h-8 text-[12.5px]">
                      <SelectValue placeholder="Tanpa induk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa induk</SelectItem>
                      {pihakList
                        .filter(
                          (x) =>
                            x.id !== p.id &&
                            x.ektp.length > 0 &&
                            !isPartyDescendant(x.id, p.id)
                        )
                        .map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {partyLabel(x)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Child dipanggil di template lewat {`{{children}}`}, parent lewat{" "}
                    {`{{parent}}`}.
                  </p>
                </div>

                {p.ektp.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.ektp.map((e) => (
                      <Badge key={e.id} variant="secondary" className="gap-1.5 py-1">
                        {e.nama}
                        <button
                          onClick={() =>
                            setPihakList((list) =>
                              list.map((x) =>
                                x.id === p.id
                                  ? { ...x, ektp: x.ektp.filter((y) => y.id !== e.id) }
                                  : x
                              )
                            )
                          }
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Hapus ${e.nama}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {ektpForPihak === p.id && (
                  <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={ektpSearch}
                        onChange={(e) => setEktpSearch(e.target.value)}
                        placeholder="Cari NIK / nama..."
                        className="h-8 pl-8 text-[12.5px]"
                      />
                    </div>
                    <div className="mt-2 max-h-48 space-y-1 overflow-y-auto scrollbar-thin">
                      {ektpResults.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => addEktpToPihak(p.id, e)}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent"
                        >
                          <span>
                            <span className="block text-[12.5px] font-medium">{e.nama}</span>
                            <span className="text-[11px] text-muted-foreground">
                              NIK {e.nik} · {e.alamat}
                            </span>
                          </span>
                          {p.ektp.some((x) => x.id === e.id) ? (
                            <Check className="size-4 text-primary" />
                          ) : (
                            <Plus className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      ))}
                      {ektpResults.length === 0 && (
                        <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                          Tidak ditemukan
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addPihak}>
            <Plus className="size-4" /> Tambah Pihak
          </Button>
        </div>
      )}

      {/* STEP 4 — Pejabat */}
      {step === 4 && (
        <div className="max-w-3xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] text-muted-foreground">
              Cari dan pilih pejabat dari master data. Satu transaksi dapat memiliki
              lebih dari satu pejabat.
            </p>
            <Link
              href="/data/pejabat"
              className="shrink-0 text-[12.5px] font-medium text-primary underline"
            >
              Kelola Pejabat
            </Link>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={pejabatSearch}
              onChange={(e) => setPejabatSearch(e.target.value)}
              placeholder="Cari nama, NIK, jabatan, atau wilayah..."
              className="pl-9"
            />
          </div>

          {selectedPejabat.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                Pejabat terpilih
              </p>
              {selectedPejabat.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3"
                >
                  <UserRound className="size-4 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold">{p.nama}</p>
                    <p className="text-[11.5px] text-muted-foreground">
                      {p.nama_jabatan || "-"} ·{" "}
                      {p.role_name === "kepala_desa"
                        ? "Kepala Desa"
                        : "Perangkat Desa"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() =>
                      setSelectedPejabat((list) =>
                        list.filter((item) => item.id !== p.id)
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
              Hasil pencarian
            </p>
            {pejabatResults.length === 0 ? (
              <EmptyState
                icon={UserRound}
                title="Pejabat tidak ditemukan"
                description="Ubah kata kunci atau tambahkan master pejabat di menu Data → Pejabat."
              />
            ) : (
              pejabatResults.map((p) => {
                const checked = selectedPejabat.some((x) => x.id === p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setSelectedPejabat((list) =>
                          v
                            ? list.some((x) => x.id === p.id)
                              ? list
                              : [...list, p]
                            : list.filter((x) => x.id !== p.id)
                        )
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold">{p.nama}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {p.nik}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {p.nama_jabatan || "-"} ·{" "}
                        {p.role_name === "kepala_desa"
                          ? "Kepala Desa"
                          : "Perangkat Desa"}
                        {p.wilayah
                          ? ` · ${p.wilayah.desa}, ${p.wilayah.kecamatan}`
                          : ""}
                      </p>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* STEP 5 — Sections */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            Section menghubungkan item dengan uraian. Detail terisi otomatis dari uraian dan masih
            bisa diedit.
          </p>
          {sections.length === 0 && (
            <EmptyState
              icon={FileText}
              title="Belum ada section"
              description="Tambahkan section lalu pilih item dan uraian."
            />
          )}
          {sections.map((sec, index) => (
            <Card key={index} className="border shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold">Section {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() =>
                      setSections((list) => list.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Item</Label>
                    <Select
                      value={sec.item_id ? String(sec.item_id) : ""}
                      onValueChange={(v) => updateSection(index, { item_id: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih item" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemList.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.nama_item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Uraian</Label>
                    <Select
                      value={sec.uraian_id ? String(sec.uraian_id) : ""}
                      onValueChange={(v) => {
                        const selected = uraianList.find((u) => u.id === Number(v));
                        updateSection(index, {
                          uraian_id: selected?.id ?? null,
                          detail: selected?.isi_uraian ?? sec.detail,
                          short_text: selected?.isi_singkat ?? "",
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih uraian" />
                      </SelectTrigger>
                      <SelectContent>
                        {uraianList.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.nama_uraian}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Pihak (untuk section per pihak)</Label>
                  <Select
                    value={sec.pihak ?? "none"}
                    onValueChange={(v) =>
                      updateSection(index, { pihak: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tanpa pihak (umum)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa pihak (umum)</SelectItem>
                      {pihakList
                        .filter((x) => x.ektp.length > 0)
                        .map((x) => (
                          <SelectItem key={x.id} value={x.id}>
                            {partyLabel(x)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Dipanggil di template: {`{{section('Nama Item', 'ROLE')}}`} atau{" "}
                    {`{{section('Nama Item', p)}}`}.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Short Text</Label>
                  <Textarea
                    rows={2}
                    value={sec.short_text}
                    onChange={(e) => updateSection(index, { short_text: e.target.value })}
                    placeholder="Terisi otomatis dari isi singkat uraian, dapat diedit"
                    className="text-[12.5px] leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Dipakai di template lewat {`{{section_short('Nama Item')}}`}.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Detail</Label>
                  <Textarea
                    rows={4}
                    value={sec.detail}
                    onChange={(e) => updateSection(index, { detail: e.target.value })}
                    placeholder="Detail section (otomatis dari uraian, dapat diedit)"
                    className="text-[12.5px] leading-relaxed"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>Sisipkan simbol:</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => updateSection(index, { detail: `${sec.detail}\\n` })}
                    >
                      Enter (\n)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => updateSection(index, { detail: `${sec.detail}\\t` })}
                    >
                      Tab (\t)
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    \n menjadi baris baru (Enter) dan \t menjadi tab di dokumen Word.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button type="button" variant="outline" onClick={addSection}>
            <Plus className="size-4" /> Tambah Section
          </Button>
        </div>
      )}

      {/* STEP 6 — Custom Field */}
      {step === 6 && (
        <div className="max-w-2xl space-y-5">
          {fieldGroups.map((g) => {
            const fields = activeCustomFields.filter((f) => f.group_id === g.id);
            if (fields.length === 0) return null;
            return (
              <Card key={g.id} className="border shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[14px]">{g.title}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {fields.map((f) => (
                    <CustomFieldInput
                      key={f.id}
                      field={f}
                      value={customValues[f.name] ?? f.default_value ?? ""}
                      onChange={(v) =>
                        setCustomValues((c) => ({ ...c, [f.name]: v }))
                      }
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* STEP 7 — Pilih Surat */}
      {step === 7 && (
        <div>
          <p className="mb-3 text-[13px] text-muted-foreground">
            Koleksi surat untuk jenis transaksi{" "}
            <span className="font-semibold text-foreground">
              {jenisList.find((j) => j.id === jenisId)?.nama_jenistransaksi}
            </span>
          </p>
          {collection.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Koleksi kosong"
              description="Admin belum mengonfigurasi surat untuk jenis transaksi ini."
            />
          ) : (
            <div className="space-y-3">
              {collection.map((s) => {
                const checked = selectedSurat.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-all",
                      checked ? "border-primary ring-2 ring-primary/15" : "border-border hover:border-primary/40"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={s.wajib}
                      onCheckedChange={(c) =>
                        setSelectedSurat((sel) =>
                          c ? [...sel, s.id] : sel.filter((x) => x !== s.id)
                        )
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold">{s.nama_surat}</p>
                        {s.wajib ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="size-3" /> Wajib
                          </Badge>
                        ) : (
                          <Badge variant="outline">Opsional</Badge>
                        )}
                        {s.template && <StatusBadge status={s.template.status} />}
                      </div>
                      <p className="mt-1 text-[12.5px] text-muted-foreground">
                        {s.jenis_surat} · {s.keterangan}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        Template: {s.template?.name ?? "Tidak tersedia"} (v{s.template?.version})
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* STEP 8 — Preview */}
      {step === 8 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">Ringkasan Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[13px]">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Jenis Transaksi</p>
                  <p className="font-semibold">{jenisList.find((j) => j.id === jenisId)?.nama_jenistransaksi}</p>
                </div>
                <div>
                  <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Nomor / Tanggal</p>
                  <p className="font-semibold">{txForm.nomor_transaksi} · {formatDate(txForm.tanggal_transaksi)}</p>
                </div>
                <div>
                  <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Objek</p>
                  <p className="font-semibold">
                    {obyekDetail
                      ? `${(obyekDetail as Obyek & { jenishak?: { nama_jenishak: string } }).jenishak?.nama_jenishak} No. ${obyekDetail.nomor_hak} — ${formatNumber(obyekDetail.luas_tanah)} m²`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Surat Dipilih</p>
                  <p className="font-semibold">{selectedSurat.length} surat</p>
                </div>
              </div>
              <div>
                <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Pihak</p>
                {penjual.map((e) => (
                  <p key={e.id} className="mt-1">Penjual: {e.nama} ({e.nik})</p>
                ))}
                {pembeli.map((e) => (
                  <p key={e.id} className="mt-1">Pembeli: {e.nama} ({e.nik})</p>
                ))}
                {saksi.map((e) => (
                  <p key={e.id} className="mt-1">Saksi: {e.nama}</p>
                ))}
              </div>
              <div>
                <p className="text-[11.5px] font-medium tracking-wide text-muted-foreground uppercase">Custom Field</p>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                  {activeCustomFields.map((f) => (
                    <div key={f.id} className="flex justify-between gap-2 text-[12.5px]">
                      <span className="text-muted-foreground">{f.field_title}</span>
                      <span className="truncate font-medium">
                        {f.name === "harga_transaksi" && customValues[f.name]
                          ? `Rp${formatNumber(customValues[f.name] as string | number)}`
                          : String(customValues[f.name] ?? "-")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-muted/60 p-3 text-[12.5px]">
                <p className="font-semibold">Fungsi terbilang</p>
                <p className="mt-1">
                  {customValues.harga_transaksi
                    ? `${terbilang(customValues.harga_transaksi as number, "rupiah")}`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">
                Preview Dokumen — {previewDoc?.surat.nama_surat ?? "-"}
              </CardTitle>
              <CardDescription>Pratinjau teks hasil render template.</CardDescription>
            </CardHeader>
            <CardContent>
              {previewDoc ? (
                <div className="max-h-[520px] overflow-y-auto rounded-lg border bg-muted/30 p-5 scrollbar-thin">
                  <pre className="font-sans text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground">
                    {previewDoc.text}
                  </pre>
                </div>
              ) : (
                <EmptyState icon={FileText} title="Tidak ada surat untuk dipreview" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 8 && generated.length > 0 && (
        <Card className="border-emerald-500/40 bg-emerald-500/5 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[15px] text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-5" /> Dokumen Berhasil Digenerate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {generated.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{d.title}</p>
                  <p className="font-mono text-[11.5px] text-muted-foreground">
                    {d.document_number}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => handleDownloadGenerated(d)}
                >
                  <Download className="size-4" /> Unduh DOCX
                </Button>
              </div>
            ))}
            <p className="text-[11.5px] text-muted-foreground">
              File pertama otomatis terunduh. Dokumen juga tersedia di halaman Dokumen.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between border-t pt-4">
        <Button variant="outline" onClick={back} disabled={step === 0}>
          <ArrowLeft className="size-4" /> Sebelumnya
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Selanjutnya <ArrowRight className="size-4" />
          </Button>
        ) : generated.length > 0 ? (
          <Button asChild>
            <Link href="/dokumen">
              <CheckCircle2 className="size-4" /> Lihat Dokumen
            </Link>
          </Button>
        ) : (
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {generating ? "Menggenerate..." : "Generate DOCX"}
          </Button>
        )}
      </div>
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldWithOptions;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (field.data_type === "textarea") {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <Label>
          {field.field_title} {field.required && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          rows={2}
          value={String(value ?? "")}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }
  if (field.data_type === "multiselect") {
    const options = field.options ?? [];
    const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (option: string) =>
      onChange(
        selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option]
      );
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <Label>
          {field.field_title} {field.required && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12.5px]"
            >
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() => toggle(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
        {options.length === 0 && (
          <p className="text-[11.5px] text-muted-foreground">Belum ada opsi untuk field ini.</p>
        )}
      </div>
    );
  }
  if (field.data_type === "list" || field.data_type === "list_from_database") {
    const options =
      field.data_type === "list_from_database"
        ? [
            { value: "1", label: "Hak Milik" },
            { value: "2", label: "Hak Guna Bangunan" },
            { value: "3", label: "Hak Pakai" },
            { value: "4", label: "Hak Guna Usaha" },
          ]
        : (field.options ?? []);
    return (
      <div className="space-y-1.5">
        <Label>
          {field.field_title} {field.required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  if (field.data_type === "boolean") {
    return (
      <div className="flex items-center gap-2 pt-5">
        <Checkbox checked={Boolean(value)} onCheckedChange={(c) => onChange(Boolean(c))} />
        <Label className="cursor-pointer">{field.field_title}</Label>
      </div>
    );
  }
  const isDate = field.data_type === "date" || field.data_type === "datetime";
  const isNumber = field.data_type === "number";
  return (
    <div className="space-y-1.5">
      <Label>
        {field.field_title} {field.required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        type={isDate ? "date" : isNumber ? "number" : "text"}
        value={String(value ?? "")}
        placeholder={field.placeholder}
        onChange={(e) =>
          onChange(isNumber && e.target.value !== "" ? Number(e.target.value) : e.target.value)
        }
      />
      {isNumber && typeof value === "number" && value > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Rp{formatNumber(value)} · {terbilang(value)}
        </p>
      )}
    </div>
  );
}
