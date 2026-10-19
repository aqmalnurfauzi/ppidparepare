import 'server-only';

import { requireAuth, AuthError } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_USER_CATEGORIES,
  ALLOWED_ADMIN_CATEGORIES,
  validateDocumentFile,
  type DocumentCategory,
} from './validation';
import {
  DOKUMEN_USER_PROJECTION,
  type DokumenDTO,
  type DokumenSignedUrlDTO,
  type DokumenQuotaStatusDTO,
} from '@/types/dokumen';

export const PRIVATE_STORAGE_BUCKET = 'permohonan-dokumen';
export const SIGNED_URL_TTL_SECONDS = 60; // 60 seconds ephemeral lifetime

/**
 * Check document upload quota status for a given permohonan.
 */
export async function getPermohonanDokumenQuotaStatus(
  permohonanId: string
): Promise<DokumenQuotaStatusDTO> {
  const { user, profile, supabase } = await requireAuth();

  // 1. Verify ownership of permohonan
  const { data: permohonan, error: permohonanError } = await supabase
    .from('permohonan')
    .select('id, pemohon_id')
    .eq('id', permohonanId)
    .maybeSingle();

  if (permohonanError || !permohonan) {
    throw new Error('Permohonan tidak ditemukan.');
  }

  if (profile.role !== 'admin' && permohonan.pemohon_id !== user.id) {
    throw new AuthError('FORBIDDEN', 'Akses ditolak: Anda bukan pemilik permohonan ini.');
  }

  // 2. Fetch all document categories for this permohonan
  const { data: docs, error: docsError } = await supabase
    .from('dokumen_permohonan')
    .select('kategori_dokumen')
    .eq('permohonan_id', permohonanId);

  if (docsError) {
    throw new Error(`Gagal memeriksa kuota dokumen: ${docsError.message}`);
  }

  const existingDocs = docs || [];
  const ktpUploaded = existingDocs.some(d => d.kategori_dokumen === 'identitas_ktp');
  const supportingCount = existingDocs.filter(d =>
    ['surat_kuasa', 'akta_organisasi', 'dokumen_pendukung'].includes(d.kategori_dokumen)
  ).length;

  return {
    permohonan_id: permohonanId,
    ktp_uploaded: ktpUploaded,
    supporting_count: supportingCount,
    max_supporting: 5,
    can_upload_ktp: !ktpUploaded,
    can_upload_supporting: supportingCount < 5,
  };
}

/**
 * Securely upload a document to private storage and record in database.
 *
 * Security Enforcements:
 * 1. Caller authentication & active profile.
 * 2. Ownership verification (must own permohonan or be admin).
 * 3. Role-based category allowlist.
 * 4. Quota check (KTP max 1, supporting max 5).
 * 5. Magic-byte and executable binary inspection.
 * 6. Server-generated unpredictable storage path.
 * 7. Audit log in log_aktivitas.
 */
export async function uploadDokumenPermohonan(params: {
  permohonanId: string;
  fileBuffer: Uint8Array;
  originalFilename: string;
  declaredMimeType?: string;
  kategori: DocumentCategory;
}): Promise<DokumenDTO> {
  const { permohonanId, fileBuffer, originalFilename, declaredMimeType, kategori } = params;
  const { user, profile, supabase } = await requireAuth();

  // 1. Verify ownership of permohonan
  const { data: permohonan, error: permohonanError } = await supabase
    .from('permohonan')
    .select('id, pemohon_id, nomor_permohonan')
    .eq('id', permohonanId)
    .maybeSingle();

  if (permohonanError || !permohonan) {
    throw new Error('Permohonan tidak ditemukan.');
  }

  const isAdmin = profile.role === 'admin';
  if (!isAdmin && permohonan.pemohon_id !== user.id) {
    throw new AuthError('FORBIDDEN', 'Akses ditolak: Anda bukan pemilik permohonan ini.');
  }

  // 2. Role restriction on categories
  if (ALLOWED_ADMIN_CATEGORIES.includes(kategori as any) && !isAdmin) {
    throw new AuthError('FORBIDDEN', `Kategori "${kategori}" hanya dapat diunggah oleh administrator.`);
  }

  if (!isAdmin && !ALLOWED_USER_CATEGORIES.includes(kategori as any)) {
    throw new AuthError('FORBIDDEN', `Kategori "${kategori}" tidak diizinkan untuk pemohon.`);
  }

  // 3. Quota enforcement
  const quota = await getPermohonanDokumenQuotaStatus(permohonanId);
  if (kategori === 'identitas_ktp' && quota.ktp_uploaded) {
    throw new Error('Permohonan ini sudah memiliki dokumen KTP. Hanya 1 file KTP yang diperbolehkan.');
  }

  if (['surat_kuasa', 'akta_organisasi', 'dokumen_pendukung'].includes(kategori) && !quota.can_upload_supporting) {
    throw new Error('Batas kuota dokumen pendukung terlampaui: maksimal 5 dokumen pendukung per permohonan.');
  }

  // 4. File binary inspection (Magic bytes, MIME, size, dangerous code)
  const validation = validateDocumentFile({
    buffer: fileBuffer,
    originalFilename,
    declaredMimeType,
  });

  if (!validation.valid || !validation.detectedMime) {
    throw new Error(`Validasi file gagal: ${validation.error || 'Format file tidak valid'}`);
  }

  // Determine extension from detected MIME
  const extMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
  };
  const fileExt = extMap[validation.detectedMime] || 'bin';

  // 5. Generate secure server-derived storage path
  // Format: {permohonanId}/{uuid}.{ext}
  const fileId = crypto.randomUUID();
  const storagePath = `${permohonanId}/${fileId}.${fileExt}`;

  // 6. Upload file to private bucket using server-side admin client
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from(PRIVATE_STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: validation.detectedMime,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Gagal menyimpan file ke private storage: ${uploadError.message}`);
  }

  // 7. Insert record into public.dokumen_permohonan
  const { data: docRecord, error: insertError } = await adminClient
    .from('dokumen_permohonan')
    .insert({
      id: fileId,
      permohonan_id: permohonanId,
      kategori_dokumen: kategori,
      storage_path: storagePath,
      original_filename: validation.sanitizedFilename || 'dokumen',
      mime_type: validation.detectedMime,
      file_size_bytes: fileBuffer.length,
    })
    .select(DOKUMEN_USER_PROJECTION)
    .single();

  if (insertError || !docRecord) {
    // Attempt compensation: clean up uploaded storage file
    await adminClient.storage.from(PRIVATE_STORAGE_BUCKET).remove([storagePath]);
    throw new Error(`Gagal mencatat dokumen ke database: ${insertError?.message}`);
  }

  // 8. Record audit trail in log_aktivitas
  try {
    await adminClient.from('log_aktivitas').insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'upload_dokumen',
      target_entity: 'dokumen_permohonan',
      target_id: fileId,
      metadata: {
        permohonan_id: permohonanId,
        nomor_permohonan: permohonan.nomor_permohonan,
        kategori_dokumen: kategori,
        file_size_bytes: fileBuffer.length,
        mime_type: validation.detectedMime,
      },
    });
  } catch (auditErr) {
    console.error('[AUDIT ERROR] Gagal mencatat log aktivitas upload dokumen:', auditErr);
  }

  return docRecord as unknown as DokumenDTO;
}

/**
 * Generate a short-lived signed URL (60s) for private document access.
 *
 * Security Enforcements:
 * 1. Caller authentication & active profile.
 * 2. Ownership verification (must own associated permohonan or be admin).
 * 3. Ephemeral signed URL with 60 seconds lifetime.
 * 4. Audit trail recorded.
 */
export async function getDokumenSignedUrl(dokumenId: string): Promise<DokumenSignedUrlDTO> {
  const { user, profile } = await requireAuth();
  const adminClient = createAdminClient();

  // 1. Fetch document metadata including storage_path
  const { data: doc, error: docError } = await adminClient
    .from('dokumen_permohonan')
    .select('id, permohonan_id, storage_path, original_filename')
    .eq('id', dokumenId)
    .maybeSingle();

  if (docError || !doc) {
    throw new Error('Dokumen tidak ditemukan.');
  }

  // 2. Fetch associated permohonan to verify ownership
  const { data: permohonan, error: permohonanError } = await adminClient
    .from('permohonan')
    .select('id, pemohon_id, nomor_permohonan')
    .eq('id', doc.permohonan_id)
    .maybeSingle();

  if (permohonanError || !permohonan) {
    throw new Error('Permohonan terkait tidak ditemukan.');
  }

  const isAdmin = profile.role === 'admin';
  if (!isAdmin && permohonan.pemohon_id !== user.id) {
    throw new AuthError('FORBIDDEN', 'Akses ditolak: Anda tidak memiliki izin untuk mengunduh dokumen ini.');
  }

  // 3. Generate 60-second signed URL via Storage API
  const { data: signedData, error: signError } = await adminClient.storage
    .from(PRIVATE_STORAGE_BUCKET)
    .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);

  if (signError || !signedData?.signedUrl) {
    throw new Error(`Gagal membuat signed URL: ${signError?.message || 'Storage error'}`);
  }

  // 4. Record audit trail
  try {
    await adminClient.from('log_aktivitas').insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'akses_dokumen_signed_url',
      target_entity: 'dokumen_permohonan',
      target_id: dokumenId,
      metadata: {
        permohonan_id: doc.permohonan_id,
        nomor_permohonan: permohonan.nomor_permohonan,
        expires_in_seconds: SIGNED_URL_TTL_SECONDS,
      },
    });
  } catch (auditErr) {
    console.error('[AUDIT ERROR] Gagal mencatat log aktivitas akses dokumen:', auditErr);
  }

  return {
    dokumen_id: dokumenId,
    signed_url: signedData.signedUrl,
    expires_in_seconds: SIGNED_URL_TTL_SECONDS,
  };
}

/**
 * List documents for a given permohonan safely.
 */
export async function listDokumenPermohonan(permohonanId: string): Promise<DokumenDTO[]> {
  const { user, profile, supabase } = await requireAuth();

  // 1. Verify ownership of permohonan
  const { data: permohonan, error: permohonanError } = await supabase
    .from('permohonan')
    .select('id, pemohon_id')
    .eq('id', permohonanId)
    .maybeSingle();

  if (permohonanError || !permohonan) {
    throw new Error('Permohonan tidak ditemukan.');
  }

  if (profile.role !== 'admin' && permohonan.pemohon_id !== user.id) {
    throw new AuthError('FORBIDDEN', 'Akses ditolak: Anda bukan pemilik permohonan ini.');
  }

  // 2. Fetch documents using safe user projection (NO storage_path exposed)
  const { data: docs, error: docsError } = await supabase
    .from('dokumen_permohonan')
    .select(DOKUMEN_USER_PROJECTION)
    .eq('permohonan_id', permohonanId)
    .order('created_at', { ascending: true });

  if (docsError) {
    throw new Error(`Gagal mengambil daftar dokumen: ${docsError.message}`);
  }

  return (docs || []) as unknown as DokumenDTO[];
}
