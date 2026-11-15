"use client";

import { useEffect } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { toast } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/http";

let backendWarned = false;

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const reason: unknown = e.reason;
      if (reason instanceof ApiError) {
        e.preventDefault();
        toast.error("Terjadi kesalahan", { description: reason.message });
        return;
      }
      if (
        typeof reason === "object" &&
        reason !== null &&
        "message" in reason &&
        typeof (reason as { message: unknown }).message === "string" &&
        (reason as { message: string }).message.includes("backend")
      ) {
        e.preventDefault();
        if (!backendWarned) {
          backendWarned = true;
          toast.error("Backend tidak terjangkau", {
            description:
              "Pastikan FastAPI berjalan dan NEXT_PUBLIC_API_URL benar.",
          });
        }
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </NextThemesProvider>
  );
}
