"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Braces, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { CustomField, CustomFieldGroup } from "@/lib/types";

type GroupWithFields = CustomFieldGroup & {
  fields: (CustomField & { options?: { value: string; label: string }[] })[];
};

const DATA_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date Time" },
  { value: "list", label: "List (pilihan)" },
  { value: "list_from_database", label: "List dari Database" },
  { value: "multiselect", label: "Multi Select" },
  { value: "boolean", label: "Boolean" },
  { value: "textarea", label: "Textarea" },
];

export default function DynamicFieldPage() {
  const [groups, setGroups] = useState<GroupWithFields[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomField | null>(null);
  const [optionTarget, setOptionTarget] = useState<CustomField | null>(null);
  const [newOption, setNewOption] = useState({ value: "", label: "" });
  const [form, setForm] = useState({
    name: "",
    field_title: "",
    data_type: "text",
    group_id: "",
    required: false,
    placeholder: "",
  });

  const refresh = () => api.listCustomFieldGroups().then(setGroups);

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.field_title.trim() || !form.group_id) {
      toast.error("Nama field, label, dan group wajib diisi");
      return;
    }
    const payload = {
      name: form.name.trim().toLowerCase().replace(/\s+/g, "_"),
      field_title: form.field_title,
      data_type: form.data_type,
      group_id: Number(form.group_id),
      required: form.required,
      placeholder: form.placeholder,
      display: true,
      is_active: true,
    };
    try {
      if (editing) {
        await api.updateCustomField(editing.id, payload);
        toast.success("Custom field diperbarui");
      } else {
        await api.createCustomField(payload);
        toast.success("Custom field berhasil dibuat");
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: "", field_title: "", data_type: "text", group_id: "", required: false, placeholder: "" });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan custom field");
    }
    return;
    setGroups((gs) =>
      gs.map((g) => {
        if (g.id !== Number(form.group_id)) return g;
        const field: CustomField = {
          id: Date.now(),
          name: form.name.trim().toLowerCase().replace(/\s+/g, "_"),
          field_title: form.field_title,
          data_type: form.data_type as CustomField["data_type"],
          group_id: g.id,
          source_type: "manual",
          source_config: null,
          default_value: null,
          display: true,
          required: form.required,
          placeholder: form.placeholder,
          description: "",
          sort_order: g.fields.length + 1,
          is_active: true,
        };
        return { ...g, fields: [...g.fields, field] };
      })
    );
    toast.success("Custom field berhasil dibuat");
    setOpen(false);
    setForm({ name: "", field_title: "", data_type: "text", group_id: "", required: false, placeholder: "" });
  };

  const handleEdit = (field: CustomField) => {
    setEditing(field);
    setForm({
      name: field.name,
      field_title: field.field_title,
      data_type: field.data_type,
      group_id: String(field.group_id ?? ""),
      required: field.required,
      placeholder: field.placeholder,
    });
    setOpen(true);
  };

  const handleAddOption = async () => {
    if (!optionTarget) return;
    if (!newOption.value.trim() || !newOption.label.trim()) {
      toast.error("Value dan label wajib diisi");
      return;
    }
    try {
      await api.createCustomFieldOption(optionTarget.id, {
        value: newOption.value.trim(),
        label: newOption.label.trim(),
      });
      toast.success("Option ditambahkan");
      setNewOption({ value: "", label: "" });
      setOptionTarget(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah option");
    }
  };

  const handleDeleteOption = async (optionId: number) => {
    try {
      await api.deleteCustomFieldOption(optionId);
      toast.success("Option dihapus");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus option");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteCustomField(deleteTarget.id);
      toast.success("Custom field dihapus");
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus custom field");
    }
  };

  return (
    <div>
      <PageHeader
        title="Dynamic Field"
        description="Buat custom field tambahan tanpa mengubah struktur database."
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" /> Tambah Custom Field
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Custom Field" : "Tambah Custom Field"}</DialogTitle>
              <DialogDescription>
                Field dapat digunakan di template sebagai {`{{custom.nama_field}}`}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3.5 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nama Field *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="harga_transaksi"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Label *</Label>
                  <Input
                    value={form.field_title}
                    onChange={(e) => setForm({ ...form, field_title: e.target.value })}
                    placeholder="Harga Transaksi"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipe Data</Label>
                  <Select
                    value={form.data_type}
                    onValueChange={(v) => setForm({ ...form, data_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Group</Label>
                  <Select
                    value={form.group_id}
                    onValueChange={(v) => setForm({ ...form, group_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Placeholder</Label>
                <Input
                  value={form.placeholder}
                  onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
                  placeholder="Contoh: 500000000"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="required"
                  checked={form.required}
                  onCheckedChange={(c) => setForm({ ...form, required: Boolean(c) })}
                />
                <Label htmlFor="required" className="cursor-pointer">
                  Wajib diisi saat generate dokumen
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={handleCreate}>Simpan Field</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <Tabs defaultValue={String(groups[0]?.id ?? "empty")}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {groups.map((g) => (
            <TabsTrigger key={g.id} value={String(g.id)}>
              {g.title}
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-[10.5px]">
                {g.fields.length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((g) => (
          <TabsContent key={g.id} value={String(g.id)} className="mt-4">
            {g.fields.length === 0 ? (
              <EmptyState
                icon={Braces}
                title="Belum ada field"
                description="Tambah custom field untuk group ini."
              />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {g.fields.map((f) => {
                  const options = f.options ?? [];
                  return (
                    <Card key={f.id} className="border shadow-none">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold">{f.field_title}</p>
                            <p className="font-mono text-[11.5px] text-primary">
                              {"{{custom." + f.name + "}}"}
                            </p>
                          </div>
                           <div className="flex items-center gap-1">
                             <Button size="icon" variant="ghost" className="size-7" onClick={() => handleEdit(f)}>
                               <Pencil className="size-3.5" />
                             </Button>
                             <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(f)}>
                               <Trash2 className="size-3.5" />
                             </Button>
                             <StatusBadge status={f.is_active ? "active" : "inactive"} />
                           </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary">{f.data_type}</Badge>
                          <Badge variant="outline">{f.source_type}</Badge>
                          {f.required && <Badge className="bg-rose-500/10 text-rose-600 border-transparent">required</Badge>}
                          {f.display && <Badge className="bg-sky-500/10 text-sky-600 border-transparent">display</Badge>}
                        </div>
                        {(f.data_type === "list" || f.data_type === "multiselect") && (
                          <div className="mt-3">
                            <p className="mb-1 text-[11px] font-medium text-muted-foreground uppercase">
                              Options
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {options.map((o) => (
                               <span
                                 key={o.value}
                                 className="group rounded-md bg-muted px-2 py-0.5 text-[11.5px]"
                               >
                                 {o.label}
                                 {typeof o.id === "number" && (
                                   <button
                                     type="button"
                                     className="ml-1 text-destructive opacity-0 group-hover:opacity-100"
                                     onClick={() => handleDeleteOption(o.id as number)}
                                   >
                                     ×
                                   </button>
                                 )}
                               </span>
                              ))}
                               <button
                                 type="button"
                                 onClick={() => { setOptionTarget(f); setNewOption({ value: "", label: "" }); }}
                                 className="rounded-md border border-dashed px-2 py-0.5 text-[11.5px] text-muted-foreground hover:text-primary"
                               >
                                 + option
                               </button>
                            </div>
                          </div>
                        )}
                        {f.data_type === "list_from_database" && (
                          <p className="mt-3 rounded-md bg-muted/60 p-2 font-mono text-[11px] text-muted-foreground">
                            {JSON.stringify(f.source_config)}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={optionTarget !== null} onOpenChange={(o) => !o && setOptionTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Option</DialogTitle>
            <DialogDescription>Tambah pilihan untuk {optionTarget?.field_title}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input value={newOption.value} onChange={(e) => setNewOption({ ...newOption, value: e.target.value })} placeholder="transfer" />
            </div>
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input value={newOption.label} onChange={(e) => setNewOption({ ...newOption, label: e.target.value })} placeholder="Transfer" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionTarget(null)}>Batal</Button>
            <Button onClick={handleAddOption}>Simpan Option</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive sm:mx-0">
              <AlertTriangle className="size-6" />
            </div>
            <AlertDialogTitle className="pt-2">Hapus custom field?</AlertDialogTitle>
            <AlertDialogDescription>
              Field <span className="font-semibold text-foreground">{deleteTarget?.field_title}</span>{" "}
              beserta nilainya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
