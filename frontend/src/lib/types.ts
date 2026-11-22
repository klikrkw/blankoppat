export type RoleName = "Super Admin" | "Admin" | "Operator" | "Viewer";

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  roles: RoleName[];
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface Permission {
  id: number;
  name: string;
  module: string;
  description: string;
}

export interface EktpRecord {
  id: number;
  nik: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: "LAKI-LAKI" | "PEREMPUAN";
  alamat: string;
  rt: string;
  rw: string;
  wilayah_id?: number | null;
  wilayah?: {
    id?: number;
    kode_wilayah?: string;
    desa?: string;
    tipe_desa?: string;
    kecamatan?: string;
    kabupaten?: string;
    tipe_kabupaten?: string;
    provinsi?: string;
  } | null;
  agama: string;
  status_perkawinan: "BELUM KAWIN" | "KAWIN" | "CERAI HIDUP" | "CERAI MATI";
  pekerjaan: string;
  kewarganegaraan: string;
  created_at: string;
  updated_at: string;
}

export interface JenisHak {
  id: number;
  nama_jenishak: string;
  singkatan: string;
}

export interface Letak {
  id: number;
  nama_desa: string;
  kecamatan_id?: number | null;
  kecamatan?: string;
}

export interface Edisi {
  id: number;
  nama_edisi: string;
}

export interface Obyek {
  id: number;
  jenishak_id: number | null;
  // "manual" dipertahankan untuk data lama; nilai baru memakai "analog".
  jenis_sertipikat: "analog" | "elektronik" | "manual";
  nomor_hak: string;
  persil: string;
  klas: string;
  luas_tanah: number;
  luas_bangunan: number | null;
  atas_nama: string;
  penggunaan: "pertanian" | "non-pertanian";
  no_surat_ukur: string;
  tanggal_surat_ukur: string;
  nib: string;
  nop: string;
  nomor_seri_blanko: string;
  batas_utara: string;
  batas_timur: string;
  batas_selatan: string;
  batas_barat: string;
  wilayah_id: number | null;
  wilayah?: {
    id?: number;
    kode_wilayah?: string;
    desa?: string;
    tipe_desa?: string;
    kecamatan?: string;
    kabupaten?: string;
    tipe_kabupaten?: string;
    provinsi?: string;
  } | null;
  // Alias datar dari API (obyek.desa, obyek.tipe_kabupaten, dst).
  desa?: string;
  tipe_desa?: string;
  kecamatan?: string;
  kabupaten?: string;
  tipe_kabupaten?: string;
  provinsi?: string;
  edisi_id?: number | null;
  edisi?: Edisi | null;
}

export interface TemplateCategory {
  id: number;
  name: string;
  code: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface TemplateGroup {
  id: number;
  name: string;
  code: string;
  description: string;
  category_id: number | null;
  category?: { id: number; name: string } | null;
  sort_order: number;
  is_active: boolean;
  template_count?: number;
}

export type TemplateStatus = "draft" | "active" | "archived";

export interface Template {
  id: number;
  name: string;
  code: string;
  description: string;
  category_id: number | null;
  group_id: number | null;
  file_path: string;
  version: number;
  status: TemplateStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
  content?: string;
}

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "list"
  | "list_from_database"
  | "multiselect"
  | "boolean"
  | "textarea";

export interface CustomFieldGroup {
  id: number;
  name: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}

export interface CustomField {
  id: number;
  name: string;
  field_title: string;
  data_type: CustomFieldType;
  group_id: number;
  source_type: "manual" | "database";
  source_config: { table?: string; value_column?: string; label_column?: string } | null;
  default_value: string | null;
  display: boolean;
  required: boolean;
  placeholder: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  options?: { id?: number; value: string; label: string }[];
}

export interface CustomFieldOption {
  id: number;
  custom_field_id: number;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export interface Item {
  id: number;
  nama_item: string;
  keterangan?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SectionItem {
  id?: number;
  item_id: number;
  item?: Item | null;
  uraian_id?: number | null;
  pihak_id?: string | null;
  nama_item?: string;
  nama_uraian?: string;
  nama_pihak?: string;
  sebutan_pihak?: string;
  detail: string;
  short_text?: string;
  urutan?: number;
}

export interface JenisTransaksi {
  id: number;
  nama_jenistransaksi: string;
}

export interface Surat {
  id: string;
  template_id: number;
  jenis_surat: string;
  nama_surat: string;
  keterangan: string;
}

export interface SuratCollectionItem extends Surat {
  urutan: number;
  wajib: boolean;
  default_selected: boolean;
  is_active: boolean;
  template?: Template;
}

export type TransaksiStatus = "draft" | "active" | "completed" | "archived";

export interface Transaksi {
  id: string;
  user_id: number;
  jenistransaksi_id: number;
  obyek_id: number | null;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  judul: string;
  status: TransaksiStatus;
  keterangan: string;
  created_at: string;
  updated_at: string;
}

export type PihakRole = "PENJUAL" | "PEMBELI" | "PELEPAS" | "PENERIMA" | "SAKSI";

export interface Pihak {
  id: string;
  transaksi_id: string;
  nama_pihak: PihakRole;
  sebutan_pihak: string;
  urutan: number;
  keterangan: string;
  ektp: EktpRecord[];
}

export type DocumentStatus = "draft" | "generated" | "archived";

export interface DocumentItem {
  id: string;
  transaction_id: string;
  surat_id: string;
  template_id: number;
  template_version_id: number;
  document_number: string;
  title: string;
  status: DocumentStatus;
  generated_file: string;
  created_by: number;
  created_at: string;
  snapshot: Record<string, unknown>;
}

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  module: string;
  record_id: string;
  detail: string;
  ip_address: string;
  created_at: string;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  price: number;
  billing_period: "monthly" | "yearly";
  document_limit: number | null;
  is_free: boolean;
  is_active: boolean;
  sort_order: number;
  features: string[];
}

export interface UserSubscription {
  id: string;
  plan_id: number;
  plan_name: string;
  status: "pending" | "active" | "expired" | "cancelled";
  starts_at: string;
  ends_at: string;
  document_limit: number;
  document_used: number;
  auto_renew: boolean;
}

export interface BankAccount {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
  is_active: boolean;
}

export interface Provinsi {
  id: number;
  code: string;
  name: string;
}

export interface Wilayah {
  id: number;
  kode_wilayah: string;
  desa: string;
  tipe_desa: "Desa" | "Kelurahan";
  kecamatan: string;
  kabupaten: string;
  tipe_kabupaten: "Kabupaten" | "Kota";
  provinsi: string;
}

export interface Pekerjaan {
  id: number;
  nama_pekerjaan: string;
}

export interface Gelar {
  id: number;
  singkatan: string;
  kepanjangan: string;
}

export interface Uraian {
  id: number;
  nama_uraian: string;
  isi_uraian: string;
  isi_singkat: string;
  parameters?: string[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Job {
  id: number;
  name: string;
  description: string;
  staff_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Staff {
  id: number;
  ektp_id: number;
  job_id: number | null;
  jabatan: string;
  ektp?: EktpRecord | null;
  nama: string;
  nik: string;
  pekerjaan?: string;
  job?: { id: number; name: string; description: string } | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  plan_id: number;
  plan_name: string;
  amount: number;
  billing_period: "monthly" | "yearly";
  status: "pending" | "paid" | "expired" | "cancelled";
  due_at: string;
  paid_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  bank_name: string;
  amount: number;
  transfer_date: string;
  sender_name: string;
  reference_number: string;
  proof_file: string;
  status: "pending" | "verified" | "rejected";
}

export interface SystemSettings {
  company_name: string;
  address: string;
  email: string;
  phone: string;
  postal_code: string;
  permit_number: string;
  permit_date: string;
  daerah_kerja: string;
  /** Relasi ke master wilayah (id disimpan sebagai string pada settings). */
  wilayah_id: string;
  /** Relasi ke master e-KTP untuk identitas PPAT/Notaris. */
  ektp_id: string;
  default_date_format: string;
  default_currency: string;
  timezone: string;
  locale: string;
  subscription_enabled: boolean;
  free_plan_enabled: boolean;
  payment_transfer_enabled: boolean;
  invoice_due_days: number;
}

export interface PihakRoleItem {
  id: number;
  role: string;
  sebutan: string;
  is_active: boolean;
}

export interface FunctionItem {
  id: number;
  name: string;
  description: string;
  code: string;
  parameters: string[];
  implementation: string;
  return_type: string;
  is_active: boolean;
  built_in?: boolean;
}

export interface PageInfo {
  page: number;
  page_size: number;
  total: number;
}
