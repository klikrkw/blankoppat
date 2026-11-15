import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const transaksiFormSchema = z.object({
  nomor_transaksi: z.string().min(3, "Nomor transaksi wajib diisi"),
  tanggal_transaksi: z
    .string()
    .min(1, "Tanggal transaksi wajib diisi")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
  judul: z.string().min(5, "Judul minimal 5 karakter"),
  keterangan: z.string().optional(),
});

export const customFieldValueSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()])
);

export type TransaksiFormValues = z.infer<typeof transaksiFormSchema>;
