/**
 * Types & Data Transfer Objects (DTO) for Permohonan
 * Phase 2 — Gate B Safe Data Access Boundary
 *
 * Security Invariants:
 * 1. User DTO NEVER includes confidential columns (catatan_internal, tracking_token_hash).
 * 2. Public tracking DTO NEVER includes PII (NIK, address, phone, email, unmasked name).
 * 3. Projections are explicit SQL strings preventing SELECT * wildcard leaks at the DB level.
 */

export type PermohonanStatus = 'diajukan' | 'diproses' | 'selesai';

export type PermohonanDecision =
  | 'dikabulkan_sepenuhnya'
  | 'dikabulkan_sebagian'
  | 'ditolak'
  | 'tidak_dikuasai';

export type KategoriPemohon = 'perorangan' | 'kelompok' | 'badan_hukum' | string;

export type CaraMemperolehInformasi =
  | 'melihat'
  | 'membaca'
  | 'mendengarkan'
  | 'mencatat'
  | string;

export type CaraMendapatkanSalinan =
  | 'mengambil_langsung'
  | 'kurir'
  | 'pos'
  | 'email'
  | string;

/**
 * PermohonanUserDTO: Safe projection for authenticated users viewing their own requests.
 * MUST NOT contain catatan_internal or tracking_token_hash.
 */
export interface PermohonanUserDTO {
  id: string;
  nomor_permohonan: string | null;
  status_proses: PermohonanStatus;
  decision: PermohonanDecision | null;
  alasan_penolakan: string | null;
  nama_pemohon: string;
  kategori_pemohon: string | null;
  nik: string | null;
  instansi: string | null;
  alamat: string | null;
  telepon: string | null;
  email: string | null;
  kebutuhan: string;
  tujuan_penggunaan: string | null;
  cara_memperoleh_informasi: string | null;
  cara_mendapatkan_salinan: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PermohonanAdminDTO: Administrative projection for authorized PPID staff.
 * Includes operational fields like internal notes and legacy reference,
 * but still NEVER exposes tracking_token_hash.
 */
export interface PermohonanAdminDTO extends PermohonanUserDTO {
  pemohon_id: string;
  catatan_internal: string | null;
  /**
   * @deprecated LEGACY ONLY — will be removed in legacy cleanup
   */
  p_tiket_id: string | null;
}

/**
 * PermohonanPublicTrackingDTO: Masked public projection for tracking status.
 * STRICT PRIVACY: ZERO PII (no NIK, no address, no phone, no email, masked name),
 * ZERO internal notes, ZERO tokens/hashes, ZERO internal UUIDs.
 */
export interface PermohonanPublicTrackingDTO {
  nomor_permohonan: string;
  status_proses: PermohonanStatus;
  decision: PermohonanDecision | null;
  alasan_penolakan: string | null;
  tanggal_pengajuan: string;
  tanggal_pembaruan: string;
  nama_pemohon_masked: string;
}

/**
 * Explicit SQL column projection list for user queries.
 * Prevents PostgREST wildcard expansion (SELECT *) and stops confidential column leakage at the database level.
 */
export const PERMOHONAN_USER_COLUMNS = [
  'id',
  'nomor_permohonan',
  'status_proses',
  'decision',
  'alasan_penolakan',
  'nama_pemohon',
  'kategori_pemohon',
  'nik',
  'instansi',
  'alamat',
  'telepon',
  'email',
  'kebutuhan',
  'tujuan_penggunaan',
  'cara_memperoleh_informasi',
  'cara_mendapatkan_salinan',
  'created_at',
  'updated_at',
] as const;

export const PERMOHONAN_USER_PROJECTION = PERMOHONAN_USER_COLUMNS.join(',');

/**
 * Explicit SQL column projection list for admin queries.
 */
export const PERMOHONAN_ADMIN_COLUMNS = [
  ...PERMOHONAN_USER_COLUMNS,
  'pemohon_id',
  'catatan_internal',
  'p_tiket_id',
] as const;

export const PERMOHONAN_ADMIN_PROJECTION = PERMOHONAN_ADMIN_COLUMNS.join(',');

/**
 * Forbidden columns that must NEVER be requested in user or public projections.
 */
export const FORBIDDEN_USER_COLUMNS = [
  'catatan_internal',
  'tracking_token_hash',
] as const;

/**
 * Helper function to mask applicant names for public tracking views.
 * Example: "Ahmad Dahlan" -> "A**** D*****"
 */
export function maskApplicantName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') return '***';
  return fullName
    .trim()
    .split(/\s+/)
    .map(word => {
      if (word.length <= 1) return word;
      return word[0] + '*'.repeat(Math.max(1, word.length - 1));
    })
    .join(' ');
}
