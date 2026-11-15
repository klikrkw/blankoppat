import { AppShell } from "@/components/layout/app-shell";

// Seluruh halaman di grup ini memuat data di sisi klien (API layer),
// sehingga navigasi tidak memenuhi syarat "instant navigation".
// Opt-out validasi static shell untuk seluruh route di bawah layout ini.
export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
