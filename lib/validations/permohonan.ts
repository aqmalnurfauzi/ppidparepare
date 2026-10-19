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

/**
 * Validated enum for applicant category.
 */
export const KategoriPemohonEnum = z.enum(
  ['perorangan', 'kelompok', 'badan_hukum'],
  {
    error: 'Kategori pemohon harus perorangan, kelompok, atau badan_hukum',
  }
);

/**
 * Validation schema for new Permohonan creation.
 * Enforces field lengths, mandatory fields, and format boundaries.
 * Compatible with Zod 4 API.
 */
export const CreatePermohonanInputSchema = z.object({
  nama_pemohon: z
    .string({ error: 'Nama pemohon wajib diisi' })
    .trim()
    .min(1, 'Nama pemohon tidak boleh kosong')
    .max(255, 'Nama pemohon maksimal 255 karakter'),
  kebutuhan: z
    .string({ error: 'Rincian informasi yang dibutuhkan wajib diisi' })
    .trim()
    .min(1, 'Rincian informasi tidak boleh kosong')
    .max(2000, 'Rincian informasi maksimal 2000 karakter'),
  kategori_pemohon: KategoriPemohonEnum.optional().nullable(),
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, 'NIK harus terdiri dari tepat 16 digit angka')
    .optional()
    .nullable(),
  instansi: z
    .string()
    .trim()
    .max(255, 'Nama instansi maksimal 255 karakter')
    .optional()
    .nullable(),
  alamat: z
    .string()
    .trim()
    .max(500, 'Alamat maksimal 500 karakter')
    .optional()
    .nullable(),
  telepon: z
    .string()
    .trim()
    .max(20, 'Nomor telepon maksimal 20 karakter')
    .optional()
    .nullable(),
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .max(255, 'Email maksimal 255 karakter')
    .optional()
    .nullable(),
  tujuan_penggunaan: z
    .string()
    .trim()
    .max(1000, 'Tujuan penggunaan maksimal 1000 karakter')
    .optional()
    .nullable(),
  cara_memperoleh_informasi: z
    .string()
    .trim()
    .max(100, 'Cara memperoleh informasi maksimal 100 karakter')
    .optional()
    .nullable(),
  cara_mendapatkan_salinan: z
    .string()
    .trim()
    .max(100, 'Cara mendapatkan salinan maksimal 100 karakter')
    .optional()
    .nullable(),
});

export type CreatePermohonanInput = z.infer<typeof CreatePermohonanInputSchema>;
