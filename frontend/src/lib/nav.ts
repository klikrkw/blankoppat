import {
  BadgeCheck,
  Banknote,
  BookMarked,
  Boxes,
  Braces,
  Briefcase,
  CreditCard,
  FileText,
  FolderKanban,
  Gauge,
  GraduationCap,
  IdCard,
  KeyRound,
  Landmark,
  LandPlot,
  LayoutTemplate,
  ListChecks,
  MapPin,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  UserCog,
  UserRound,
  UserRoundCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: "Utama",
    items: [{ label: "Dashboard", href: "/dashboard", icon: Gauge }],
  },
  {
    label: "Dokumen",
    items: [
      { label: "Semua Dokumen", href: "/dokumen", icon: FileText },
      { label: "Dokumen Baru", href: "/dokumen/baru", icon: FileText },
      { label: "Transaksi", href: "/transaksi", icon: ScrollText },
    ],
  },
  {
    label: "Template",
    items: [
      { label: "Semua Template", href: "/template", icon: LayoutTemplate },
      { label: "Kelola Surat", href: "/template/surat", icon: ScrollText },
      { label: "Jenis Transaksi", href: "/template/jenistransaksi", icon: ListChecks },
      { label: "Kategori", href: "/template/kategori", icon: FolderKanban },
      { label: "Group", href: "/template/group", icon: FolderKanban },
    ],
  },
  {
    label: "Data",
    items: [
      { label: "e-KTP", href: "/data/ektp", icon: IdCard },
      { label: "Objek Tanah", href: "/data/obyek", icon: LandPlot },
      { label: "Jenis Hak", href: "/data/jenishak", icon: ListChecks },
      { label: "Peran Pihak", href: "/data/pihak-roles", icon: Users },
      { label: "Letak", href: "/data/letak", icon: MapPin },
      { label: "Wilayah", href: "/data/wilayah", icon: LandPlot },
      { label: "Pekerjaan", href: "/data/pekerjaan", icon: ListChecks },
      { label: "Gelar", href: "/data/gelar", icon: GraduationCap },
      { label: "Jabatan", href: "/data/jabatan", icon: Landmark },
      { label: "Pejabat", href: "/data/pejabat", icon: UserCog },
      { label: "Uraian", href: "/data/uraian", icon: FileText },
      { label: "Edisi", href: "/data/edisi", icon: BookMarked },
      { label: "Items", href: "/data/items", icon: Boxes },
      { label: "Jobs", href: "/data/jobs", icon: Briefcase },
      { label: "Staff", href: "/data/staff", icon: UserRoundCheck },
    ],
  },
  {
    label: "Dynamic Field",
    items: [
      { label: "Group & Custom Field", href: "/dynamic-field", icon: Braces },
      { label: "Function", href: "/function", icon: Wrench },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { label: "Users", href: "/administrasi/users", icon: Users },
      { label: "Roles", href: "/administrasi/roles", icon: ShieldCheck },
      { label: "Permissions", href: "/administrasi/permissions", icon: BadgeCheck },
      { label: "Audit Log", href: "/administrasi/audit-log", icon: ScrollText },
    ],
  },
  {
    label: "Bantuan",
    items: [
      { label: "Panduan", href: "/panduan", icon: ScrollText },
    ],
  },
  {
    label: "Akun",
    items: [
      { label: "Update Profil", href: "/profile", icon: UserRound },
      { label: "Ganti Password", href: "/profile/password", icon: KeyRound },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { label: "Subscription", href: "/subscription", icon: CreditCard },
      { label: "Rekening Bank", href: "/settings/bank", icon: Banknote },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dokumen": "Dokumen",
  "/dokumen/baru": "Dokumen Baru",
  "/transaksi": "Transaksi",
  "/template": "Template",
  "/template/surat": "Kelola Surat",
  "/template/jenistransaksi": "Jenis Transaksi",
  "/template/kategori": "Kategori Template",
  "/template/group": "Group Template",
  "/data/ektp": "Data e-KTP",
  "/data/obyek": "Objek Tanah",
  "/data/jenishak": "Jenis Hak",
  "/data/pihak-roles": "Peran Pihak",
  "/data/letak": "Letak",
  "/data/wilayah": "Wilayah",
  "/data/pekerjaan": "Pekerjaan",
  "/data/gelar": "Gelar",
  "/data/jabatan": "Jabatan",
  "/data/pejabat": "Pejabat",
  "/data/uraian": "Uraian",
  "/data/edisi": "Edisi",
  "/data/items": "Items",
  "/data/jobs": "Jobs",
  "/data/staff": "Staff",
  "/panduan": "Panduan",
  "/profile": "Update Profil",
  "/profile/password": "Ganti Password",
  "/dynamic-field": "Dynamic Field",
  "/function": "Function",
  "/administrasi/users": "Users",
  "/administrasi/roles": "Roles",
  "/administrasi/permissions": "Permissions",
  "/administrasi/audit-log": "Audit Log",
  "/subscription": "Subscription",
  "/settings/bank": "Rekening Bank",
  "/settings": "Settings",
};
