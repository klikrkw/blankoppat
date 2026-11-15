"use client";

import { apiFetch, ApiError, API_BASE, getToken } from "./http";
import type {
  AuditLog,
  BankAccount,
  CustomField,
  CustomFieldGroup,
  DocumentItem,
  EktpRecord,
  FunctionItem,
  Invoice,
  Job,
  Staff,
  JenisTransaksi,
  Obyek,
  Pekerjaan,
  Edisi,
  Item,
  SectionItem,
  Uraian,
  Payment,
  SubscriptionPlan,
  Surat,
  SuratCollectionItem,
  Template,
  TemplateCategory,
  TemplateGroup,
  Transaksi,
  User,
  UserSubscription,
  Wilayah,
} from "./types";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export interface LoginResult {
  token: string;
  user: User;
}

export const api = {
  // ---- Auth ----
  async login(username: string, password: string): Promise<LoginResult | null> {
    try {
      return await apiFetch<LoginResult>("/api/v1/auth/login", {
        method: "POST",
        json: { username, password },
      });
    } catch {
      return null;
    }
  },

  // ---- Dashboard ----
  async getDashboard() {
    await delay();
    return apiFetch<{
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
    }>("/api/v1/dashboard");
  },

  // ---- Data master ----
  async listEktp(search = "", page = 1, pageSize = 10) {
    await delay();
    return apiFetch<{ data: EktpRecord[]; total: number; page: number; page_size: number }>(
      "/api/v1/ektp",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async getEktp(id: number): Promise<EktpRecord> {
    return apiFetch<EktpRecord>(`/api/v1/ektp/${id}`);
  },

  async checkEktpNik(nik: string): Promise<boolean> {
    const res = await apiFetch<{ exists: boolean }>("/api/v1/ektp/check-nik", { query: { nik } });
    return res.exists ?? false;
  },

  async scanEktp(file: File): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const formData = new FormData();
    formData.append("file", file);

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/v1/ektp/scan`, {
        method: "POST",
        headers,
        body: formData,
      });
    } catch {
      throw new ApiError(0, "Tidak dapat terhubung ke backend.");
    }
    if (!res.ok) {
      let message = `Scan e-KTP gagal (${res.status})`;
      try {
        const data = await res.json();
        if (typeof data?.detail === "string") message = data.detail;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, message);
    }
    return res.json();
  },

  async createEktp(data: Partial<EktpRecord>): Promise<EktpRecord> {
    await delay(200);
    return apiFetch<EktpRecord>("/api/v1/ektp", {
      method: "POST",
      json: data,
    });
  },

  async updateEktp(id: number, data: Partial<EktpRecord>): Promise<EktpRecord> {
    await delay(200);
    return apiFetch<EktpRecord>(`/api/v1/ektp/${id}`, {
      method: "PUT",
      json: data,
    });
  },

  async deleteEktp(id: number): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/ektp/${id}`, {
      method: "DELETE",
    });
  },

  async listObyek(search = "", page = 1, pageSize = 10) {
    await delay();
    return apiFetch<{ data: Obyek[]; total: number; page: number; page_size: number }>(
      "/api/v1/obyek",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async getObyek(id: number): Promise<Obyek | undefined> {
    try {
      return await apiFetch<Obyek>(`/api/v1/obyek/${id}`);
    } catch {
      return undefined;
    }
  },

  async createObyek(data: Partial<Obyek>): Promise<Obyek> {
    await delay(200);
    return apiFetch<Obyek>("/api/v1/obyek", {
      method: "POST",
      json: data,
    });
  },

  async updateObyek(id: number, data: Partial<Obyek>): Promise<Obyek> {
    await delay(200);
    return apiFetch<Obyek>(`/api/v1/obyek/${id}`, {
      method: "PUT",
      json: data,
    });
  },

  async deleteObyek(id: number): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/obyek/${id}`, {
      method: "DELETE",
    });
  },

  async listJenishak() {
    await delay(80);
    return (await apiFetch<{ data: { id: number; nama_jenishak: string; singkatan: string }[] }>("/api/v1/jenishak")).data;
  },

  async listLetak() {
    await delay(80);
    return (await apiFetch<{ data: { id: number; nama_desa: string; kecamatan_id?: number }[] }>("/api/v1/letak")).data;
  },

  async listFunctions(): Promise<{
    custom: FunctionItem[];
    data: FunctionItem[];
  }> {
    return apiFetch<{ custom: FunctionItem[]; data: FunctionItem[] }>("/api/v1/functions");
  },

  async createFunction(data: Record<string, unknown>) {
    return apiFetch("/api/v1/functions", { method: "POST", json: data });
  },

  async updateFunction(id: number, data: Record<string, unknown>) {
    return apiFetch(`/api/v1/functions/${id}`, { method: "PUT", json: data });
  },

  async deleteFunction(id: number): Promise<void> {
    return apiFetch(`/api/v1/functions/${id}`, { method: "DELETE" });
  },

  // ---- Provinsi ----
  async listProvinsi(search = ""): Promise<import("./types").Provinsi[]> {
    return (await apiFetch<{ data: import("./types").Provinsi[] }>("/api/v1/provinsi", { query: { search } })).data;
  },

  // ---- Wilayah ----
  async listWilayah(search = "", page = 1, pageSize = 10) {
    await delay();
    return apiFetch<{ data: Wilayah[]; total: number; page: number; page_size: number }>(
      "/api/v1/wilayah",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async createWilayah(data: Partial<Wilayah>): Promise<Wilayah> {
    return apiFetch<Wilayah>("/api/v1/wilayah", {
      method: "POST",
      json: data,
    });
  },

  async getWilayah(id: number): Promise<Wilayah> {
    return apiFetch<Wilayah>(`/api/v1/wilayah/${id}`);
  },

  async updateWilayah(id: number, data: Partial<Wilayah>): Promise<Wilayah> {
    await delay(200);
    return apiFetch<Wilayah>(`/api/v1/wilayah/${id}`, {
      method: "PUT",
      json: data,
    });
  },

  async deleteWilayah(id: number): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/wilayah/${id}`, {
      method: "DELETE",
    });
  },

  // ---- Pekerjaan ----
  async listPekerjaan(search = "", page = 1, pageSize = 1000) {
    await delay(80);
    return apiFetch<{ data: Pekerjaan[]; total: number; page: number; page_size: number }>(
      "/api/v1/pekerjaan",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async createPekerjaan(nama_pekerjaan: string): Promise<Pekerjaan> {
    await delay(200);
    return apiFetch<Pekerjaan>("/api/v1/pekerjaan", {
      method: "POST",
      json: { nama_pekerjaan },
    });
  },

  async updatePekerjaan(id: number, nama_pekerjaan: string): Promise<Pekerjaan> {
    await delay(200);
    return apiFetch<Pekerjaan>(`/api/v1/pekerjaan/${id}`, {
      method: "PUT",
      json: { nama_pekerjaan },
    });
  },

  async deletePekerjaan(id: number): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/pekerjaan/${id}`, {
      method: "DELETE",
    });
  },

  // ---- Edisi ----
  async listEdisi(search = "", page = 1, pageSize = 100) {
    await delay(80);
    return apiFetch<{ data: Edisi[]; total: number; page: number; page_size: number }>(
      "/api/v1/edisi",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async checkEdisiName(nama: string, excludeId?: number): Promise<boolean> {
    const res = await apiFetch<{ exists: boolean }>("/api/v1/edisi/check-name", {
      query: { nama, exclude_id: excludeId },
    });
    return res.exists ?? false;
  },

  async createEdisi(nama_edisi: string): Promise<Edisi> {
    await delay(150);
    return apiFetch<Edisi>("/api/v1/edisi", { method: "POST", json: { nama_edisi } });
  },

  async updateEdisi(id: number, nama_edisi: string): Promise<Edisi> {
    await delay(150);
    return apiFetch<Edisi>(`/api/v1/edisi/${id}`, { method: "PUT", json: { nama_edisi } });
  },

  async deleteEdisi(id: number): Promise<void> {
    await delay(150);
    return apiFetch(`/api/v1/edisi/${id}`, { method: "DELETE" });
  },

  // ---- Items ----
  async listItems(search = "", page = 1, pageSize = 1000) {
    await delay(80);
    return apiFetch<{ data: Item[]; total: number; page: number; page_size: number }>(
      "/api/v1/items",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async checkItemName(nama: string, excludeId?: number): Promise<boolean> {
    const res = await apiFetch<{ exists: boolean }>("/api/v1/items/check-name", {
      query: { nama, exclude_id: excludeId },
    });
    return res.exists ?? false;
  },

  async createItem(data: { nama_item: string; keterangan?: string }): Promise<Item> {
    await delay(150);
    return apiFetch<Item>("/api/v1/items", { method: "POST", json: data });
  },

  async updateItem(id: number, data: { nama_item: string; keterangan?: string }): Promise<Item> {
    await delay(150);
    return apiFetch<Item>(`/api/v1/items/${id}`, { method: "PUT", json: data });
  },

  async deleteItem(id: number): Promise<void> {
    await delay(150);
    return apiFetch(`/api/v1/items/${id}`, { method: "DELETE" });
  },

  // ---- Uraian ----
  async listUraian(search = "", page = 1, pageSize = 10) {
    await delay(80);
    return apiFetch<{ data: Uraian[]; total: number; page: number; page_size: number }>(
      "/api/v1/uraian",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async checkUraianName(nama: string, excludeId?: number): Promise<boolean> {
    const res = await apiFetch<{ exists: boolean }>("/api/v1/uraian/check-name", {
      query: { nama, exclude_id: excludeId },
    });
    return res.exists ?? false;
  },

  async createUraian(data: {
    nama_uraian: string;
    isi_uraian: string;
    isi_singkat?: string;
    parameters?: string[];
  }): Promise<Uraian> {
    await delay(150);
    return apiFetch<Uraian>("/api/v1/uraian", { method: "POST", json: data });
  },

  async updateUraian(
    id: number,
    data: {
      nama_uraian: string;
      isi_uraian: string;
      isi_singkat?: string;
      parameters?: string[];
    }
  ): Promise<Uraian> {
    await delay(150);
    return apiFetch<Uraian>(`/api/v1/uraian/${id}`, { method: "PUT", json: data });
  },

  async deleteUraian(id: number): Promise<void> {
    await delay(150);
    return apiFetch(`/api/v1/uraian/${id}`, { method: "DELETE" });
  },

  // ---- Jobs & Staff ----
  async listJobs(search = "", page = 1, pageSize = 100) {
    await delay(80);
    return apiFetch<{ data: Job[]; total: number; page: number; page_size: number }>(
      "/api/v1/jobs",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async checkJobName(name: string, excludeId?: number): Promise<boolean> {
    const res = await apiFetch<{ exists: boolean }>("/api/v1/jobs/check-name", {
      query: { name, exclude_id: excludeId },
    });
    return res.exists ?? false;
  },

  async createJob(data: { name: string; description: string }): Promise<Job> {
    await delay(120);
    return apiFetch<Job>("/api/v1/jobs", { method: "POST", json: data });
  },

  async updateJob(id: number, data: { name: string; description: string }): Promise<Job> {
    await delay(120);
    return apiFetch<Job>(`/api/v1/jobs/${id}`, { method: "PUT", json: data });
  },

  async deleteJob(id: number): Promise<void> {
    await delay(120);
    return apiFetch(`/api/v1/jobs/${id}`, { method: "DELETE" });
  },

  async listStaff(search = "", page = 1, pageSize = 10) {
    await delay(80);
    return apiFetch<{ data: Staff[]; total: number; page: number; page_size: number }>(
      "/api/v1/staff",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async createStaff(data: {
    ektp_id: number;
    job_id: number | null;
    jabatan: string;
  }): Promise<Staff> {
    await delay(120);
    return apiFetch<Staff>("/api/v1/staff", { method: "POST", json: data });
  },

  async updateStaff(
    id: number,
    data: { ektp_id: number; job_id: number | null; jabatan: string }
  ): Promise<Staff> {
    await delay(120);
    return apiFetch<Staff>(`/api/v1/staff/${id}`, { method: "PUT", json: data });
  },

  async deleteStaff(id: number): Promise<void> {
    await delay(120);
    return apiFetch(`/api/v1/staff/${id}`, { method: "DELETE" });
  },

  // ---- Template ----
  async listTemplates(filters?: {
    search?: string;
    category_id?: number;
    group_id?: number;
    status?: string;
  }): Promise<(Template & { category?: { name: string }; group?: { name: string } })[]> {
    await delay();
    const res = await apiFetch<{
      data: (Template & { category?: { name: string } | null; group?: { name: string } | null })[];
    }>("/api/v1/templates", { query: { ...filters, status: filters?.status === "all" ? undefined : filters?.status } });
    return res.data.map((t) => ({
      ...t,
      category: t.category ?? undefined,
      group: t.group ?? undefined,
    }));
  },

  async createTemplate(data: Partial<Template>): Promise<Template> {
    await delay(250);
    return apiFetch<Template>("/api/v1/templates", {
      method: "POST",
      json: {
        name: data.name,
        code: data.code,
        description: data.description,
        category_id: data.category_id,
        group_id: data.group_id,
        content: data.content ?? "",
        status: data.status ?? "draft",
      },
    });
  },

  async getTemplateContent(templateId: number): Promise<string> {
    await delay(100);
    const res = await apiFetch<{ content: string }>(`/api/v1/templates/${templateId}/content`);
    return res.content ?? "";
  },

  async updateTemplate(id: number, data: Partial<Template>): Promise<Template> {
    await delay(200);
    return apiFetch<Template>(`/api/v1/templates/${id}`, {
      method: "PUT",
      json: {
        name: data.name,
        code: data.code,
        description: data.description,
        category_id: data.category_id,
        group_id: data.group_id,
        status: data.status,
      },
    });
  },

  async updateTemplateContent(id: number, content: string): Promise<void> {
    await apiFetch(`/api/v1/templates/${id}/content`, {
      method: "PUT",
      json: { content },
    });
  },

  async uploadTemplateDocx(id: number, file: File): Promise<{ file_path: string; content: string }> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/v1/templates/${id}/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      body: form,
    });
    if (!res.ok) {
      let message = `Upload gagal (${res.status})`;
      try {
        const data = await res.json();
        if (typeof data?.detail === "string") message = data.detail;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, message);
    }
    return (await res.json()) as { file_path: string; content: string };
  },

  async deleteTemplate(id: number): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/templates/${id}`, {
      method: "DELETE",
    });
  },

  async listCategories(): Promise<TemplateCategory[]> {
    await delay(80);
    return (await apiFetch<{ data: TemplateCategory[] }>("/api/v1/template-categories")).data;
  },

  async createCategory(data: Partial<TemplateCategory>): Promise<TemplateCategory> {
    return apiFetch<TemplateCategory>("/api/v1/template-categories", { method: "POST", json: data });
  },

  async updateCategory(id: number, data: Partial<TemplateCategory>): Promise<TemplateCategory> {
    return apiFetch<TemplateCategory>(`/api/v1/template-categories/${id}`, { method: "PUT", json: data });
  },

  async deleteCategory(id: number): Promise<void> {
    return apiFetch(`/api/v1/template-categories/${id}`, { method: "DELETE" });
  },

  async listGroups(): Promise<TemplateGroup[]> {
    await delay(80);
    return (await apiFetch<{ data: TemplateGroup[] }>("/api/v1/template-groups")).data;
  },

  async createGroup(data: {
    name: string;
    code: string;
    description: string;
    category_id: number | null;
    sort_order: number;
    is_active: boolean;
  }): Promise<TemplateGroup> {
    return apiFetch<TemplateGroup>("/api/v1/template-groups", { method: "POST", json: data });
  },

  async updateGroup(
    id: number,
    data: {
      name: string;
      code: string;
      description: string;
      category_id: number | null;
      sort_order: number;
      is_active: boolean;
    }
  ): Promise<TemplateGroup> {
    return apiFetch<TemplateGroup>(`/api/v1/template-groups/${id}`, { method: "PUT", json: data });
  },

  async deleteGroup(id: number): Promise<void> {
    return apiFetch(`/api/v1/template-groups/${id}`, { method: "DELETE" });
  },

  // ---- Custom field ----
  async listCustomFieldGroups(): Promise<
    (CustomFieldGroup & { fields: (CustomField & { options?: { value: string; label: string }[] })[] })[]
  > {
    await delay();
    return (await apiFetch<{
      data: (CustomFieldGroup & { fields: (CustomField & { options?: { value: string; label: string }[] })[] })[];
    }>("/api/v1/custom-field-groups")).data;
  },

  async listCustomFields(): Promise<CustomField[]> {
    await delay();
    return (await apiFetch<{ data: CustomField[] }>("/api/v1/custom-fields")).data;
  },

  async createCustomField(data: Record<string, unknown>): Promise<CustomField> {
    return apiFetch<CustomField>("/api/v1/custom-fields", { method: "POST", json: data });
  },

  async updateCustomField(id: number, data: Record<string, unknown>): Promise<CustomField> {
    return apiFetch<CustomField>(`/api/v1/custom-fields/${id}`, { method: "PUT", json: data });
  },

  async createCustomFieldOption(fieldId: number, data: { value: string; label: string }): Promise<void> {
    return apiFetch(`/api/v1/custom-fields/${fieldId}/options`, { method: "POST", json: data });
  },

  async deleteCustomFieldOption(optionId: number): Promise<void> {
    return apiFetch(`/api/v1/custom-field-options/${optionId}`, { method: "DELETE" });
  },

  async deleteCustomField(id: number): Promise<void> {
    return apiFetch(`/api/v1/custom-fields/${id}`, { method: "DELETE" });
  },

  // ---- Peran pihak ----
  async listPihakRoles(): Promise<import("./types").PihakRoleItem[]> {
    return (await apiFetch<{ data: import("./types").PihakRoleItem[] }>("/api/v1/pihak-roles")).data;
  },

  async createPihakRole(data: { role: string; sebutan: string; is_active: boolean }) {
    return apiFetch<import("./types").PihakRoleItem>("/api/v1/pihak-roles", { method: "POST", json: data });
  },

  async updatePihakRole(id: number, data: { role: string; sebutan: string; is_active: boolean }) {
    return apiFetch<import("./types").PihakRoleItem>(`/api/v1/pihak-roles/${id}`, { method: "PUT", json: data });
  },

  async deletePihakRole(id: number): Promise<void> {
    return apiFetch(`/api/v1/pihak-roles/${id}`, { method: "DELETE" });
  },

  // ---- Jenis transaksi & surat ----
  async listJenistransaksi(): Promise<(JenisTransaksi & { surat_count: number })[]> {
    await delay();
    return (await apiFetch<{ data: (JenisTransaksi & { surat_count: number })[] }>("/api/v1/jenistransaksi")).data;
  },

  async listSurat(): Promise<Surat[]> {
    await delay(80);
    return (await apiFetch<{ data: Surat[] }>("/api/v1/surat")).data;
  },

  async getSuratCollection(jenistransaksiId: number): Promise<SuratCollectionItem[]> {
    await delay();
    const res = await apiFetch<{ surat: SuratCollectionItem[] }>(
      `/api/v1/jenistransaksi/${jenistransaksiId}/surat`
    );
    return res.surat ?? [];
  },

  async createSurat(data: { template_id: number | null; jenis_surat: string; nama_surat: string; keterangan?: string }): Promise<Surat> {
    await delay(200);
    return apiFetch<Surat>("/api/v1/surat", { method: "POST", json: data });
  },

  async updateSurat(id: string, data: { template_id: number | null; jenis_surat: string; nama_surat: string; keterangan?: string }): Promise<Surat> {
    await delay(200);
    return apiFetch<Surat>(`/api/v1/surat/${id}`, { method: "PUT", json: data });
  },

  async deleteSurat(id: string): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/surat/${id}`, { method: "DELETE" });
  },

  async createJenistransaksi(nama_jenistransaksi: string): Promise<JenisTransaksi> {
    await delay(200);
    return apiFetch<JenisTransaksi>("/api/v1/jenistransaksi", { method: "POST", json: { nama_jenistransaksi } });
  },

  async updateJenistransaksi(id: number, nama_jenistransaksi: string): Promise<JenisTransaksi> {
    await delay(200);
    return apiFetch<JenisTransaksi>(`/api/v1/jenistransaksi/${id}`, { method: "PUT", json: { nama_jenistransaksi } });
  },

  async deleteJenistransaksi(id: number): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/jenistransaksi/${id}`, { method: "DELETE" });
  },

  async assignSurat(jenisId: number, surat_id: string, opts?: { urutan?: number; wajib?: boolean; default_selected?: boolean }): Promise<void> {
    await delay(150);
    return apiFetch(`/api/v1/jenistransaksi/${jenisId}/surat`, {
      method: "POST",
      json: { surat_id, urutan: opts?.urutan ?? 0, wajib: opts?.wajib ?? false, default_selected: opts?.default_selected ?? false },
    });
  },

  async removeSurat(jenisId: number, surat_id: string): Promise<void> {
    await delay(150);
    return apiFetch(`/api/v1/jenistransaksi/${jenisId}/surat/${surat_id}`, { method: "DELETE" });
  },

  async saveSuratCollection(
    jenisId: number,
    items: { surat_id: string; urutan: number; wajib: boolean; default_selected: boolean }[]
  ): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/jenistransaksi/${jenisId}/surat`, {
      method: "PUT",
      json: { items },
    });
  },

  async nextTransaksiNumber(): Promise<string> {
    const res = await apiFetch<{ nomor_transaksi: string }>("/api/v1/transaksi/next-number");
    return res.nomor_transaksi ?? "";
  },

  // ---- Transaksi ----
  async listTransaksi(
    search = "",
    page = 1,
    pageSize = 10
  ): Promise<{
    data: (Transaksi & { jenistransaksi?: { nama_jenistransaksi: string } })[];
    total: number;
    page: number;
    page_size: number;
  }> {
    await delay();
    return apiFetch<{
      data: (Transaksi & { jenistransaksi?: { nama_jenistransaksi: string } })[];
      total: number;
      page: number;
      page_size: number;
    }>("/api/v1/transaksi", { query: { search, page, page_size: pageSize } });
  },

  async deleteTransaksi(id: string): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/transaksi/${id}`, { method: "DELETE" });
  },

  async getTransaksi(id: string): Promise<{
    id: string;
    jenistransaksi_id: number;
    obyek_id: number | null;
    nomor_transaksi: string;
    tanggal_transaksi: string;
    judul: string;
    status: string;
    keterangan: string;
    pihak: { id: string; role: string; sebutan: string; pihak_role_id?: number | null; urutan: number; ektp: EktpRecord[] }[];
    sections?: SectionItem[];
    surat_ids: string[];
    custom_fields: Record<string, unknown>;
  }> {
    return apiFetch(`/api/v1/transaksi/${id}`);
  },

  async updateTransaksi(
    id: string,
    input: {
      jenistransaksi_id: number;
      judul: string;
      tanggal_transaksi: string;
      obyek_id: number | null;
      keterangan: string;
      nomor_transaksi: string;
      pihak: { role: string; sebutan: string; pihak_role_id?: number; ektp_ids: number[] }[];
      sections?: { item_id: number; uraian_id?: number | null; detail: string; short_text?: string }[];
      surat_ids: string[];
      custom_fields: Record<string, unknown>;
    }
  ): Promise<void> {
    await delay(300);
    return apiFetch(`/api/v1/transaksi/${id}`, {
      method: "PUT",
      json: {
        jenistransaksi_id: input.jenistransaksi_id,
        judul: input.judul,
        tanggal_transaksi: input.tanggal_transaksi,
        obyek_id: input.obyek_id,
        keterangan: input.keterangan,
        nomor_transaksi: input.nomor_transaksi,
        pihak: input.pihak.map((p) => ({
          nama_pihak: p.role,
          sebutan_pihak: p.sebutan,
          pihak_role_id: p.pihak_role_id,
          ektp_ids: p.ektp_ids,
        })),
        ...(input.sections
          ? {
              sections: input.sections.map((sec) => ({
                item_id: sec.item_id,
                uraian_id: sec.uraian_id ?? null,
                detail: sec.detail,
                short_text: sec.short_text ?? "",
              })),
            }
          : {}),
        surat_ids: input.surat_ids,
        custom_fields: input.custom_fields,
      },
    });
  },

  async createTransaksi(input: {
    jenistransaksi_id: number;
    judul: string;
    tanggal_transaksi: string;
    obyek_id: number | null;
    keterangan: string;
    nomor_transaksi: string;
    pihak: { role: string; sebutan: string; pihak_role_id?: number; ektp_ids: number[] }[];
    sections?: { item_id: number; uraian_id?: number | null; detail: string; short_text?: string }[];
  }): Promise<Transaksi> {
    await delay(350);
    return apiFetch<Transaksi>("/api/v1/transaksi", {
      method: "POST",
      json: {
        jenistransaksi_id: input.jenistransaksi_id,
        judul: input.judul,
        tanggal_transaksi: input.tanggal_transaksi,
        obyek_id: input.obyek_id,
        keterangan: input.keterangan,
        nomor_transaksi: input.nomor_transaksi,
        pihak: input.pihak.map((p) => ({
          nama_pihak: p.role,
          sebutan_pihak: p.sebutan,
          pihak_role_id: p.pihak_role_id,
          ektp_ids: p.ektp_ids,
        })),
        sections: (input.sections ?? []).map((sec) => ({
          item_id: sec.item_id,
          uraian_id: sec.uraian_id ?? null,
          detail: sec.detail,
          short_text: sec.short_text ?? "",
        })),
      },
    });
  },

  // ---- Dokumen ----
  async listDocuments(
    search = "",
    page = 1,
    pageSize = 10,
    status = "",
    transaction_id = ""
  ): Promise<{
    data: (DocumentItem & { template?: { name: string; version: number }; transaksi?: { nomor_transaksi: string } })[];
    total: number;
    page: number;
    page_size: number;
  }> {
    await delay();
    return apiFetch<{
      data: (DocumentItem & { template?: { name: string; version: number }; transaksi?: { nomor_transaksi: string } })[];
      total: number;
      page: number;
      page_size: number;
    }>("/api/v1/documents", {
      query: { search, page, page_size: pageSize, status, transaction_id },
    });
  },

  async generateDocuments(input: {
    transaksi_id: string;
    surat_ids: string[];
    custom_values: Record<string, unknown>;
  }): Promise<DocumentItem[]> {
    await delay(600);
    const res = await apiFetch<{ documents: DocumentItem[] }>("/api/v1/documents/generate", {
      method: "POST",
      json: {
        transaksi_id: input.transaksi_id,
        surat_ids: input.surat_ids,
        custom_fields: input.custom_values,
      },
    });
    return res.documents ?? [];
  },

  async regenerateDocuments(input: {
    transaksi_id: string;
    surat_ids: string[];
    custom_values: Record<string, unknown>;
  }): Promise<DocumentItem[]> {
    await delay(600);
    const res = await apiFetch<{ documents: DocumentItem[] }>("/api/v1/documents/regenerate", {
      method: "POST",
      json: {
        transaksi_id: input.transaksi_id,
        surat_ids: input.surat_ids,
        custom_fields: input.custom_values,
      },
    });
    return res.documents ?? [];
  },

  async getDocumentText(documentId: string): Promise<string> {
    const res = await apiFetch<{ text: string }>(`/api/v1/documents/${documentId}/text`);
    return res.text ?? "";
  },

  async getDocumentEditableText(
    documentId: string
  ): Promise<{ text: string; paragraph_count: number; row_count: number }> {
    return apiFetch<{ text: string; paragraph_count: number; row_count: number }>(
      `/api/v1/documents/${documentId}/editable-text`
    );
  },

  async updateDocumentContent(documentId: string, text: string): Promise<{ text: string }> {
    return apiFetch<{ text: string }>(`/api/v1/documents/${documentId}/content`, {
      method: "PUT",
      json: { text },
    });
  },

  async downloadDocument(documentId: string): Promise<Blob> {
    const res = await apiFetch<Response>(`/api/v1/documents/${documentId}/download`, {
      raw: true,
    });
    return await res.blob();
  },

  // ---- Subscription ----
  async getSubscription(): Promise<{ subscription: UserSubscription | null; history: UserSubscription[] }> {
    await delay(120);
    return apiFetch("/api/v1/subscription/me");
  },

  async listPlans(): Promise<SubscriptionPlan[]> {
    await delay(80);
    return (await apiFetch<{ data: SubscriptionPlan[] }>("/api/v1/subscription-plans")).data;
  },

  async getInvoices(): Promise<Invoice[]> {
    await delay(80);
    return (await apiFetch<{ data: Invoice[] }>("/api/v1/invoices")).data;
  },

  async getPayments(): Promise<Payment[]> {
    await delay(80);
    return (await apiFetch<{ data: Payment[] }>("/api/v1/payments")).data;
  },

  async getBankAccounts(): Promise<BankAccount[]> {
    await delay(80);
    return (await apiFetch<{ data: BankAccount[] }>("/api/v1/bank-accounts")).data;
  },

  async createBankAccount(data: Partial<BankAccount>): Promise<BankAccount> {
    await delay(200);
    return apiFetch<BankAccount>("/api/v1/bank-accounts", {
      method: "POST",
      json: data,
    });
  },

  async updateBankAccount(id: number, data: Partial<BankAccount>): Promise<BankAccount> {
    await delay(200);
    return apiFetch<BankAccount>(`/api/v1/bank-accounts/${id}`, {
      method: "PUT",
      json: data,
    });
  },

  async deleteBankAccount(id: number): Promise<void> {
    await delay(200);
    return apiFetch(`/api/v1/bank-accounts/${id}`, {
      method: "DELETE",
    });
  },

  async createInvoice(planId: number): Promise<Invoice> {
    await delay(250);
    return apiFetch<Invoice>("/api/v1/invoices", {
      method: "POST",
      json: { plan_id: planId },
    });
  },

  async submitPayment(input: {
    invoice_id: string;
    bank_account_id: number;
    amount: number;
    transfer_date: string;
    sender_name: string;
    proof_file: string;
  }): Promise<Payment> {
    await delay(400);
    return apiFetch<Payment>("/api/v1/payments", {
      method: "POST",
      json: input,
    });
  },

  async verifyPayment(paymentId: string): Promise<boolean> {
    try {
      await apiFetch(`/api/v1/payments/${paymentId}/verify`, { method: "POST", json: {} });
      return true;
    } catch {
      return false;
    }
  },

  async rejectPayment(paymentId: string, reason: string): Promise<boolean> {
    try {
      await apiFetch(`/api/v1/payments/${paymentId}/reject`, {
        method: "POST",
        json: { reason },
      });
      return true;
    } catch {
      return false;
    }
  },

  // ---- Settings ----
  async getSettings(): Promise<Record<string, string>> {
    await delay(80);
    return apiFetch("/api/v1/settings");
  },

  async saveSettings(next: Record<string, string>): Promise<Record<string, string>> {
    await delay(250);
    return apiFetch("/api/v1/settings", {
      method: "PUT",
      json: { settings: next },
    });
  },

  // ---- Users & Roles ----
  async listUsers(search = "", page = 1, pageSize = 10) {
    await delay(80);
    return apiFetch<{ data: User[]; total: number; page: number; page_size: number }>(
      "/api/v1/users",
      { query: { search, page, page_size: pageSize } }
    );
  },

  async listRoles(): Promise<
    { id: number; name: string; description: string; user_count: number; permissions: string[] }[]
  > {
    await delay(80);
    return (
      await apiFetch<{
        data: { id: number; name: string; description: string; user_count: number; permissions: string[] }[];
      }>("/api/v1/roles")
    ).data;
  },

  async listPermissions(): Promise<
    { id: number; name: string; module: string; description: string }[]
  > {
    await delay(80);
    return (
      await apiFetch<{ data: { id: number; name: string; module: string; description: string }[] }>(
        "/api/v1/permissions"
      )
    ).data;
  },

  async createRole(data: { name: string; description: string; permissions: string[] }) {
    return apiFetch("/api/v1/roles", { method: "POST", json: data });
  },

  async updateRole(id: number, data: { name: string; description: string; permissions: string[] }) {
    return apiFetch(`/api/v1/roles/${id}`, { method: "PUT", json: data });
  },

  async deleteRole(id: number): Promise<void> {
    return apiFetch(`/api/v1/roles/${id}`, { method: "DELETE" });
  },

  async createUser(data: {
    name: string;
    username: string;
    email: string;
    password: string;
    roles: string[];
    is_active: boolean;
  }): Promise<User> {
    return apiFetch<User>("/api/v1/users", { method: "POST", json: data });
  },

  async updateUser(
    id: number,
    data: { name: string; username: string; email: string; password?: string; roles: string[]; is_active: boolean }
  ): Promise<User> {
    return apiFetch<User>(`/api/v1/users/${id}`, { method: "PUT", json: data });
  },

  async deleteUser(id: number): Promise<void> {
    return apiFetch(`/api/v1/users/${id}`, { method: "DELETE" });
  },

  // ---- Audit ----
  async listAuditLogs(search = "", page = 1, pageSize = 20) {
    await delay();
    return apiFetch<{ data: AuditLog[]; total: number; page: number; page_size: number }>(
      "/api/v1/audit-logs",
      { query: { search, page, page_size: pageSize } }
    );
  },
};

export { ApiError };
