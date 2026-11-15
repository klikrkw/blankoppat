"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CustomField, CustomFieldGroup, EktpRecord, Item, JenisTransaksi, PihakRoleItem, SuratCollectionItem, Transaksi, Uraian } from "@/lib/types";

type EditTarget = Transaksi & { jenistransaksi?: { nama_jenistransaksi: string } };

interface PihakRoleEdit {
  role: string;
  sebutan: string;
  pihak_role_id?: number | null;
}

interface PihakEdit {
  id: string;
  roles: PihakRoleEdit[];
  ektp: EktpRecord[];
}

export function TransaksiEditDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: EditTarget | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [jenisList, setJenisList] = useState<JenisTransaksi[]>([]);
  const [obyekList, setObyekList] = useState<{ id: number; nomor_hak: string; atas_nama: string }[]>([]);
  const [obyekSearch, setObyekSearch] = useState("");
  const [selectedObyek, setSelectedObyek] = useState<{ id: number; nomor_hak: string; atas_nama: string } | null>(null);
  const [form, setForm] = useState({
    jenistransaksi_id: 0,
    nomor_transaksi: "",
    tanggal_transaksi: "",
    judul: "",
    keterangan: "",
    obyek_id: null as number | null,
  });
  const [pihak, setPihak] = useState<PihakEdit[]>([]);
  const [collection, setCollection] = useState<SuratCollectionItem[]>([]);
  const [selectedSurat, setSelectedSurat] = useState<string[]>([]);
  const [ektpSearch, setEktpSearch] = useState("");
  const [ektpResults, setEktpResults] = useState<EktpRecord[]>([]);
  const [ektpForPihak, setEktpForPihak] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldGroups, setFieldGroups] = useState<
    (CustomFieldGroup & { fields: CustomField[] })[]
  >([]);
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [pihakRoles, setPihakRoles] = useState<PihakRoleItem[]>([]);
  const [sections, setSections] = useState<
    {
      item_id: number | null;
      uraian_id: number | null;
      detail: string;
      short_text: string;
    }[]
  >([]);
  const [itemList, setItemList] = useState<Item[]>([]);
  const [uraianList, setUraianList] = useState<Uraian[]>([]);

  useEffect(() => {
    api.listJenistransaksi().then(setJenisList);
    api.listPihakRoles().then((rows) => setPihakRoles(rows.filter((r) => r.is_active)));
    api.listCustomFieldGroups().then((g) => {
      setFieldGroups(g as (CustomFieldGroup & { fields: CustomField[] })[]);
    });
    api.listItems("", 1, 1000).then((r) => setItemList(r.data));
    api.listUraian("", 1, 1000).then((r) => setUraianList(r.data));
  }, []);

  useEffect(() => {
    if (obyekSearch.trim()) {
      const t = setTimeout(() => {
        api.listObyek(obyekSearch, 1, 8).then((r) =>
          setObyekList(r.data.map((o) => ({ id: o.id, nomor_hak: o.nomor_hak, atas_nama: o.atas_nama })))
        );
      }, 250);
      return () => clearTimeout(t);
    }
  }, [obyekSearch]);

  useEffect(() => {
    if (!target || !open) return;
    api.getTransaksi(target.id).then((d) => {
      setForm({
        jenistransaksi_id: d.jenistransaksi_id,
        nomor_transaksi: d.nomor_transaksi,
        tanggal_transaksi: d.tanggal_transaksi ? d.tanggal_transaksi.slice(0, 10) : "",
        judul: d.judul,
        keterangan: d.keterangan,
        obyek_id: d.obyek_id,
      });
      if (d.obyek_id) {
        api.getObyek(d.obyek_id).then((o) => {
          if (o) {
            setSelectedObyek({ id: o.id, nomor_hak: o.nomor_hak, atas_nama: o.atas_nama });
          }
        });
      } else {
        setSelectedObyek(null);
      }
      const grouped = new Map<string, PihakEdit>();
      d.pihak.forEach((p, index) => {
        const key = p.ektp.map((e) => e.id).sort().join(",") || `empty-${index}`;
        const existing = grouped.get(key);
        const role = {
          role: p.role,
          sebutan: p.sebutan,
          pihak_role_id: p.pihak_role_id ?? pihakRoles.find((r) => r.role === p.role)?.id ?? null,
        };
        if (existing) existing.roles.push(role);
        else grouped.set(key, { id: `p-${index}`, roles: [role], ektp: p.ektp });
      });
      setPihak(Array.from(grouped.values()));
      setSelectedSurat(d.surat_ids);
      setSections(
        (d.sections ?? []).map((sec) => ({
          item_id: sec.item_id,
          uraian_id: sec.uraian_id ?? null,
          detail: sec.detail ?? "",
          short_text: sec.short_text ?? "",
        }))
      );
      setCustomValues((d.custom_fields as Record<string, unknown>) ?? {});
      api.getSuratCollection(d.jenistransaksi_id).then(setCollection);
    });
  }, [target, open, pihakRoles]);

  useEffect(() => {
    if (ektpSearch.trim()) {
      const t = setTimeout(() => {
        api.listEktp(ektpSearch, 1, 6).then((r) => setEktpResults(r.data));
      }, 250);
      return () => clearTimeout(t);
    }
  }, [ektpSearch]);

  const changeJenis = (jenisId: number) => {
    setForm((f) => ({ ...f, jenistransaksi_id: jenisId }));
    api.getSuratCollection(jenisId).then(setCollection);
    setSelectedSurat([]);
  };

  const addEktp = (pihakId: string, e: EktpRecord) => {
    setPihak((p) =>
      p.map((x) =>
        x.id === pihakId && !x.ektp.some((y) => y.id === e.id) ? { ...x, ektp: [...x.ektp, e] } : x
      )
    );
    setEktpForPihak(null);
  };

  const addSection = () =>
    setSections((list) => [
      ...list,
      { item_id: null, uraian_id: null, detail: "", short_text: "" },
    ]);

  const updateSection = (
    index: number,
    patch: Partial<{
      item_id: number | null;
      uraian_id: number | null;
      detail: string;
      short_text: string;
    }>
  ) =>
    setSections((list) => list.map((sec, i) => (i === index ? { ...sec, ...patch } : sec)));

  const handleSave = async () => {
    if (!target) return;
    if (!form.judul.trim() || !form.nomor_transaksi.trim()) {
      toast.error("Judul dan nomor transaksi wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await api.updateTransaksi(target.id, {
        jenistransaksi_id: form.jenistransaksi_id,
        judul: form.judul,
        tanggal_transaksi: form.tanggal_transaksi,
        obyek_id: form.obyek_id,
        keterangan: form.keterangan,
        nomor_transaksi: form.nomor_transaksi,
        pihak: pihak
          .filter((p) => p.ektp.length > 0)
          .flatMap((p) => p.roles.map((r) => ({
            role: r.role,
            sebutan: r.sebutan,
            pihak_role_id: r.pihak_role_id ?? undefined,
            ektp_ids: p.ektp.map((e) => e.id),
          }))),
        sections: sections
          .filter((sec) => sec.item_id)
          .map((sec) => ({
            item_id: sec.item_id as number,
            uraian_id: sec.uraian_id,
            detail: sec.detail,
            short_text: sec.short_text,
          })),
        surat_ids: selectedSurat,
        custom_fields: customValues,
      });
      toast.success("Transaksi diperbarui");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui transaksi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Transaksi</DialogTitle>
          <DialogDescription>Perbarui data transaksi, pihak, dan surat.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Tabs defaultValue="data">
            <TabsList className="mb-3 flex flex-wrap">
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="pihak">Pihak</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="custom">Custom Field</TabsTrigger>
              <TabsTrigger value="surat">Surat</TabsTrigger>
            </TabsList>
            <TabsContent value="data" className="mt-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Jenis Transaksi</Label>
              <Select
                value={String(form.jenistransaksi_id)}
                onValueChange={(v) => changeJenis(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jenisList.map((j) => (
                    <SelectItem key={j.id} value={String(j.id)}>
                      {j.nama_jenistransaksi}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Transaksi</Label>
              <Input
                type="date"
                value={form.tanggal_transaksi}
                onChange={(e) => setForm({ ...form, tanggal_transaksi: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor Transaksi *</Label>
              <Input
                value={form.nomor_transaksi}
                onChange={(e) => setForm({ ...form, nomor_transaksi: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Objek Tanah</Label>
              {selectedObyek ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-[12.5px]">
                  <span>
                    No. {selectedObyek.nomor_hak} — a.n. {selectedObyek.atas_nama}
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setSelectedObyek(null);
                      setForm((f) => ({ ...f, obyek_id: null }));
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={obyekSearch}
                      onChange={(e) => setObyekSearch(e.target.value)}
                      placeholder="Cari nomor hak..."
                      className="pl-8"
                    />
                  </div>
                  {obyekList.length > 0 && (
                    <div className="mt-1 max-h-36 space-y-1 overflow-y-auto rounded-md border p-1">
                      {obyekList.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, obyek_id: o.id }));
                            setSelectedObyek(o);
                            setObyekList([]);
                            setObyekSearch("");
                          }}
                          className="w-full rounded px-2 py-1 text-left text-[12px] hover:bg-muted"
                        >
                          No. {o.nomor_hak} — a.n. {o.atas_nama}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Judul Transaksi *</Label>
              <Input value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Keterangan</Label>
              <Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
            </div>
          </div>
            </TabsContent>
            <TabsContent value="pihak" className="mt-0">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">Pihak</p>
            {pihak.map((p) => (
              <div key={p.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 flex-wrap items-center gap-1.5">
                    {p.roles.map((roleItem, roleIndex) => (
                      <div key={`${p.id}-${roleIndex}`} className="flex h-8 items-center gap-1 rounded-md border px-1.5">
                        <Select
                          value={roleItem.role}
                          onValueChange={(v) => {
                            const r = pihakRoles.find((x) => x.role === v);
                            setPihak((list) =>
                              list.map((x) =>
                                x.id === p.id
                                  ? { ...x, roles: x.roles.map((item, ri) => ri === roleIndex ? { role: v, pihak_role_id: r?.id ?? null, sebutan: r?.sebutan ?? item.sebutan } : item) }
                                  : x
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="h-7 border-0 px-1 text-[12px] shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pihakRoles.map((r) => (
                              <SelectItem key={r.id} value={r.role}>
                                {r.role} — {r.sebutan}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {p.roles.length > 1 && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setPihak((list) =>
                                list.map((x) => x.id === p.id ? { ...x, roles: x.roles.filter((_, ri) => ri !== roleIndex) } : x)
                              )
                            }
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
                      onClick={() =>
                        setPihak((list) => list.map((x) => x.id === p.id ? { ...x, roles: [...x.roles, { role: "SAKSI", sebutan: "SAKSI" }] } : x))
                      }
                    >
                      <Plus className="size-3.5" /> Peran
                    </Button>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEktpForPihak(ektpForPihak === p.id ? null : p.id)}
                    >
                      <Plus className="size-3.5" /> Pilih e-KTP
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      onClick={() => setPihak((list) => list.filter((x) => x.id !== p.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {p.ektp.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.ektp.map((e) => (
                      <Badge key={e.id} variant="secondary" className="gap-1.5">
                        {e.nama}
                        <button
                          type="button"
                          onClick={() =>
                            setPihak((list) =>
                              list.map((x) =>
                                x.id === p.id ? { ...x, ektp: x.ektp.filter((y) => y.id !== e.id) } : x
                              )
                            )
                          }
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {ektpForPihak === p.id && (
                  <div className="mt-2 rounded-md border bg-muted/40 p-2">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={ektpSearch}
                        onChange={(e) => setEktpSearch(e.target.value)}
                        placeholder="Cari NIK / nama..."
                        className="h-8 pl-8 text-[12.5px]"
                      />
                    </div>
                    <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
                      {ektpResults.map((e) => (
                        <button
                          type="button"
                          key={e.id}
                          onClick={() => addEktp(p.id, e)}
                          className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-accent"
                        >
                          <span>
                            <span className="block text-[12.5px] font-medium">{e.nama}</span>
                            <span className="text-[11px] text-muted-foreground">NIK {e.nik}</span>
                          </span>
                          {p.ektp.some((x) => x.id === e.id) ? (
                            <span className="text-primary">✓</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPihak((p) => [...p, { id: `p-${Date.now()}`, roles: [{ role: "SAKSI", sebutan: "SAKSI" }], ektp: [] }])}
            >
              <Plus className="size-3.5" /> Tambah Pihak
            </Button>
          </div>
            </TabsContent>
            <TabsContent value="sections" className="mt-0 space-y-3">
              {sections.length === 0 && (
                <p className="text-[12.5px] text-muted-foreground">
                  Belum ada section. Tambahkan section lalu pilih item dan uraian.
                </p>
              )}
              {sections.map((sec, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-semibold">Section {index + 1}</p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      onClick={() => setSections((list) => list.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                      rows={3}
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
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={addSection}>
                <Plus className="size-3.5" /> Tambah Section
              </Button>
            </TabsContent>
            <TabsContent value="custom" className="mt-0">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">Custom Field</p>
            {fieldGroups.map((g) => {
              const fields = g.fields?.filter((f) => f.display) ?? [];
              if (fields.length === 0) return null;
              return (
                <div key={g.id} className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                  {fields.map((f) => {
                    const value = customValues[f.name] ?? f.default_value ?? "";
                    if (f.data_type === "textarea") {
                      return (
                        <div key={f.id} className="col-span-2 space-y-1.5">
                          <Label>{f.field_title}</Label>
                          <Textarea
                            rows={2}
                            value={String(value ?? "")}
                            onChange={(e) =>
                              setCustomValues((c) => ({ ...c, [f.name]: e.target.value }))
                            }
                          />
                        </div>
                      );
                    }
                    if (f.data_type === "multiselect") {
                      const options = f.options ?? [];
                      const selected: string[] = Array.isArray(value) ? (value as string[]) : [];
                      const toggle = (option: string) =>
                        setCustomValues((c) => ({
                          ...c,
                          [f.name]: selected.includes(option)
                            ? selected.filter((item) => item !== option)
                            : [...selected, option],
                        }));
                      return (
                        <div key={f.id} className="col-span-2 space-y-1.5">
                          <Label>{f.field_title}</Label>
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
                            <p className="text-[11.5px] text-muted-foreground">
                              Belum ada opsi untuk field ini.
                            </p>
                          )}
                        </div>
                      );
                    }
                    if (f.data_type === "list" || f.data_type === "list_from_database") {
                      return (
                        <div key={f.id} className="space-y-1.5">
                          <Label>{f.field_title}</Label>
                          <Select
                            value={String(value ?? "")}
                            onValueChange={(v) =>
                              setCustomValues((c) => ({ ...c, [f.name]: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(f.options ?? []).map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    }
                    const isNumber = f.data_type === "number";
                    const isDate = f.data_type === "date" || f.data_type === "datetime";
                    return (
                      <div key={f.id} className="space-y-1.5">
                        <Label>
                          {f.field_title} {f.required && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          type={isDate ? "date" : isNumber ? "number" : "text"}
                          value={String(value ?? "")}
                          onChange={(e) =>
                            setCustomValues((c) => ({
                              ...c,
                              [f.name]:
                                isNumber && e.target.value !== ""
                                  ? Number(e.target.value)
                                  : e.target.value,
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
            </TabsContent>
            <TabsContent value="surat" className="mt-0">
          <div className="space-y-2">
            <p className="text-[12px] font-semibold tracking-wider text-muted-foreground uppercase">Surat</p>
            {collection.length === 0 && (
              <p className="text-[12.5px] text-muted-foreground">Belum ada surat pada jenis transaksi ini.</p>
            )}
            {collection.map((s) => {
              const checked = selectedSurat.includes(s.id);
              return (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(c) =>
                      setSelectedSurat((sel) =>
                        c ? [...sel, s.id] : sel.filter((x) => x !== s.id)
                      )
                    }
                  />
                  <div>
                    <p className="text-[13px] font-medium">{s.nama_surat}</p>
                    <p className="text-[11.5px] text-muted-foreground">Template: {s.template?.name ?? "-"}</p>
                  </div>
                </label>
              );
            })}
          </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
