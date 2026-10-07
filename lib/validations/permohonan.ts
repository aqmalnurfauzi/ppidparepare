import { z } from 'zod';

/**
 * UUID validator for Permohonan ID parameter.
 * Strictly prevents path traversal, SQL injection, or invalid UUID types.
 * Compatible with Zod 4 API.
 */
export const PermohonanIdSchema = z
  .string({ error: 'ID permohonan wajib diisi dan harus berupa string' })
  .uuid('ID permohonan harus berformat UUID yang valid');

/**
 * Whitelist schema for Permohonan list sorting column.
 */
export const PermohonanSortBySchema = z.enum(
  ['created_at', 'updated_at', 'nomor_permohonan'],
  {
    error: 'Kolom pengurutan tidak valid. Hanya created_at, updated_at, atau nomor_permohonan yang diizinkan.',
  }
);

/**
 * Whitelist schema for sort direction.
 */
export const PermohonanSortOrderSchema = z.enum(
  ['asc', 'desc'],
  {
    error: 'Arah pengurutan harus "asc" atau "desc".',
  }
);

/**
 * Whitelist schema for permohonan process status filter.
 */
export const PermohonanStatusFilterSchema = z.enum(
  ['diajukan', 'diproses', 'selesai'],
  {
    error: 'Filter status proses tidak valid. Hanya diajukan, diproses, atau selesai yang diizinkan.',
  }
);

/**
 * Safe query validation schema for paginated list queries.
 * Enforces bounded limits and whitelisted sorting.
 * Compatible with Zod 4 API.
 */
export const PermohonanListQuerySchema = z.object({
  page: z.coerce
    .number({ error: 'Halaman harus berupa angka' })
    .int('Halaman harus berupa bilangan bulat')
    .min(1, 'Halaman minimal 1')
    .default(1),
  limit: z.coerce
    .number({ error: 'Limit harus berupa angka' })
    .int('Limit harus berupa bilangan bulat')
    .min(1, 'Limit minimal 1')
    .max(100, 'Limit maksimal 100 per halaman')
    .default(10),
  status: PermohonanStatusFilterSchema.optional(),
  sortBy: PermohonanSortBySchema.default('created_at'),
  sortOrder: PermohonanSortOrderSchema.default('desc'),
  search: z
    .string()
    .trim()
    .max(100, 'Kata kunci pencarian maksimal 100 karakter')
    .optional(),
});

export type PermohonanListQuery = z.infer<typeof PermohonanListQuerySchema>;
