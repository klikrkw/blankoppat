import type { Metadata } from "next";
import "@fontsource/poppins/300.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Blanko PPAT — Aplikasi Dokumen PPAT",
    template: "%s — Blanko PPAT",
  },
  description:
    "Aplikasi pembuatan blanko/dokumen PPAT otomatis berbasis template Microsoft Word dengan data terpusat dari database.",
};

// Aplikasi memuat data sepenuhnya di sisi klien (client-side data fetching),
// sehingga navigasi tidak memenuhi syarat "instant navigation".
// `false` di root layout menonaktifkan validasi static-shell untuk seluruh app.
export const instant = false;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning className="h-full">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
