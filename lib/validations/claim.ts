import { z } from 'zod';

export const NikSchema = z
  .string({ error: 'NIK wajib diisi' })
  .trim()
  .min(1, { error: 'NIK wajib diisi' })
  .regex(/^\d{16}$/, { error: 'NIK harus terdiri dari 16 digit angka' });

export const LegacyIdSchema = z
  .string({ error: 'Nomor permohonan lama wajib diisi' })
  .trim()
  .min(1, { error: 'Nomor permohonan lama wajib diisi' })
  .min(3, { error: 'Nomor permohonan lama minimal 3 karakter' })
  .max(50, { error: 'Nomor permohonan lama maksimal 50 karakter' });

export const TanggalPengajuanSchema = z
  .string({ error: 'Tanggal pengajuan wajib diisi' })
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Format tanggal harus YYYY-MM-DD (contoh: 2024-05-20)' });

export const LegacyClaimSchema = z.object({
  legacyId: LegacyIdSchema,
  nik: NikSchema,
  tanggalPengajuan: TanggalPengajuanSchema,
});

export type LegacyClaimInput = z.infer<typeof LegacyClaimSchema>;
