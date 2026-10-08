/**
 * Types & Data Transfer Objects (DTO) for Dokumen Permohonan
 * Phase 2 — Gate B Private Document Security Foundation
 *
 * Security Invariants:
 * 1. User DTO never exposes internal raw storage_path.
 * 2. Document signed URLs are short-lived (60 seconds) and ephemeral.
 * 3. Projections prevent wildcard (SELECT *) leakage.
 */

import type { DocumentCategory } from '@/lib/storage/validation';

export interface DokumenDTO {
  id: string;
  permohonan_id: string;
  kategori_dokumen: DocumentCategory;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface DokumenSignedUrlDTO {
  dokumen_id: string;
  signed_url: string;
  expires_in_seconds: number;
}

export interface DokumenQuotaStatusDTO {
  permohonan_id: string;
  ktp_uploaded: boolean;
  supporting_count: number;
  max_supporting: number;
  can_upload_ktp: boolean;
  can_upload_supporting: boolean;
}

/**
 * Safe SQL column projection list for user queries.
 * Prevents PostgREST wildcard expansion and stops internal storage_path leakage.
 */
export const DOKUMEN_USER_COLUMNS = [
  'id',
  'permohonan_id',
  'kategori_dokumen',
  'original_filename',
  'mime_type',
  'file_size_bytes',
  'created_at',
] as const;

export const DOKUMEN_USER_PROJECTION = DOKUMEN_USER_COLUMNS.join(',');
