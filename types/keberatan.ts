/**
 * Type Contracts & DTOs for Keberatan (Objection) Flow
 * Phase 2 — Gate B: Objection Authorization & Data Boundary
 */

export type KeberatanStatus = 'diajukan' | 'diproses' | 'selesai';

export interface KeberatanUserDTO {
  id: string;
  permohonan_id: string;
  nomor_keberatan: string | null;
  alasan_keberatan: string;
  kasus_posisi: string | null;
  status_keberatan: KeberatanStatus;
  tanggapan_atasan: string | null;
  created_at: string;
  updated_at: string;
}

export interface KeberatanAdminDTO extends KeberatanUserDTO {
  permohonan?: {
    nomor_permohonan: string | null;
    nama_pemohon: string;
    kebutuhan: string;
    decision: string | null;
  } | null;
}

export const KEBERATAN_USER_COLUMNS = [
  'id',
  'permohonan_id',
  'nomor_keberatan',
  'alasan_keberatan',
  'kasus_posisi',
  'status_keberatan',
  'tanggapan_atasan',
  'created_at',
  'updated_at',
] as const;

export const KEBERATAN_USER_PROJECTION =
  'id, permohonan_id, nomor_keberatan, alasan_keberatan, kasus_posisi, status_keberatan, tanggapan_atasan, created_at, updated_at' as const;

export const KEBERATAN_ADMIN_COLUMNS = [
  'id',
  'permohonan_id',
  'nomor_keberatan',
  'alasan_keberatan',
  'kasus_posisi',
  'status_keberatan',
  'tanggapan_atasan',
  'created_at',
  'updated_at',
] as const;

export const KEBERATAN_ADMIN_PROJECTION =
  'id, permohonan_id, nomor_keberatan, alasan_keberatan, kasus_posisi, status_keberatan, tanggapan_atasan, created_at, updated_at' as const;
