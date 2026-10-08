import { z } from 'zod';
import { PermohonanIdSchema } from './permohonan.ts';

export const KeberatanIdSchema = z
  .string({ error: 'ID keberatan wajib diisi' })
  .uuid({ error: 'ID keberatan harus berformat UUID valid' });

export const KeberatanStatusSchema = z.enum(['diajukan', 'diproses', 'selesai'], {
  error: 'Status keberatan harus salah satu dari: diajukan, diproses, atau selesai',
});

export const CreateKeberatanSchema = z.object({
  permohonanId: PermohonanIdSchema,
  alasanKeberatan: z
    .string({ error: 'Alasan keberatan wajib diisi' })
    .trim()
    .min(5, { error: 'Alasan keberatan minimal 5 karakter' })
    .max(2000, { error: 'Alasan keberatan maksimal 2000 karakter' }),
  kasusPosisi: z
    .string()
    .trim()
    .max(3000, { error: 'Kasus posisi maksimal 3000 karakter' })
    .optional()
    .nullable(),
});

export const AdminUpdateKeberatanSchema = z
  .object({
    keberatanId: KeberatanIdSchema,
    statusKeberatan: KeberatanStatusSchema,
    tanggapanAtasan: z.string().trim().max(3000).optional().nullable(),
    nomorKeberatan: z.string().trim().max(50).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.statusKeberatan === 'selesai') {
      if (!data.tanggapanAtasan || data.tanggapanAtasan.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: 'Tanggapan atasan PPID wajib diisi saat status keberatan selesai',
          path: ['tanggapanAtasan'],
        });
      }
    }
  });

export const KeberatanListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: KeberatanStatusSchema.optional(),
  permohonanId: PermohonanIdSchema.optional(),
  sortBy: z.enum(['created_at', 'updated_at', 'status_keberatan'], {
    error: 'Kolom pengurutan tidak valid',
  }).default('created_at'),
  sortOrder: z.enum(['asc', 'desc'], {
    error: 'Arah pengurutan harus asc atau desc',
  }).default('desc'),
});

export type CreateKeberatanInput = z.infer<typeof CreateKeberatanSchema>;
export type AdminUpdateKeberatanInput = z.infer<typeof AdminUpdateKeberatanSchema>;
export type KeberatanListQueryInput = z.infer<typeof KeberatanListQuerySchema>;
