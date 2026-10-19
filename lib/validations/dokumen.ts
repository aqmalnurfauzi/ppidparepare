/**
 * Document Storage & Upload Validation Schemas
 * Phase 3 — Workstream 2: Private Document Upload & Storage Pipeline
 *
 * Enforces:
 * 1. UUID validation for permohonanId and dokumenId parameters.
 * 2. Category allowlisting matching Phase 2 database check constraints.
 * 3. Role-based separation between applicant categories and administrator categories.
 * 4. Bounded parameters preventing injection and unexpected payload shapes.
 */

import { z } from 'zod';
import { PermohonanIdSchema } from './permohonan.ts';
import {
  ALLOWED_USER_CATEGORIES,
  ALLOWED_ADMIN_CATEGORIES,
  ALL_DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type UserDocumentCategory,
  type AdminDocumentCategory,
} from '../storage/validation.ts';

export { PermohonanIdSchema };

/**
 * UUID validator for Dokumen ID parameter.
 */
export const DokumenIdSchema = z
  .string({ error: 'ID dokumen wajib diisi' })
  .uuid({ error: 'ID dokumen harus berformat UUID yang valid' });

/**
 * Whitelist schema for all recognized document categories.
 */
export const DocumentCategorySchema = z.enum(ALL_DOCUMENT_CATEGORIES, {
  error: 'Kategori dokumen tidak valid.',
});

/**
 * Whitelist schema for categories allowed to be uploaded by applicants.
 */
export const UserDocumentCategorySchema = z.enum(ALLOWED_USER_CATEGORIES, {
  error:
    'Kategori dokumen pemohon harus salah satu dari: identitas_ktp, surat_kuasa, akta_organisasi, atau dokumen_pendukung.',
});

/**
 * Whitelist schema for categories allowed to be uploaded only by administrators.
 */
export const AdminDocumentCategorySchema = z.enum(ALLOWED_ADMIN_CATEGORIES, {
  error:
    'Kategori dokumen administrator harus salah satu dari: bukti_penerimaan atau dokumen_jawaban.',
});

/**
 * Input validation schema for document upload action.
 */
export const UploadDokumenInputSchema = z.object({
  permohonanId: PermohonanIdSchema,
  kategori: DocumentCategorySchema,
});

/**
 * Input validation schema for signed URL retrieval action.
 */
export const GetSignedUrlInputSchema = z.object({
  dokumenId: DokumenIdSchema,
});

/**
 * Input validation schema for listing documents of a permohonan.
 */
export const ListDokumenInputSchema = z.object({
  permohonanId: PermohonanIdSchema,
});

export type UploadDokumenInput = z.infer<typeof UploadDokumenInputSchema>;
export type GetSignedUrlInput = z.infer<typeof GetSignedUrlInputSchema>;
export type ListDokumenInput = z.infer<typeof ListDokumenInputSchema>;
