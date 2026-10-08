import 'server-only';

import { requireAuth, AuthError } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  generateTrackingToken,
  hashTrackingToken,
  verifyTrackingToken,
  isValidTrackingTokenFormat,
} from './token';
import {
  maskApplicantName,
  type PermohonanPublicTrackingDTO,
} from '@/types/permohonan';

/**
 * In-memory IP/identifier rate limiting for public tracking lookups
 * Prevents automated enumeration of application numbers & brute force of tokens.
 */
interface RateLimitBucket {
  attempts: number;
  resetAt: number;
}
const trackingRateLimits = new Map<string, RateLimitBucket>();

function checkTrackingRateLimit(identifier: string): boolean {
  const now = Date.now();
  const bucket = trackingRateLimits.get(identifier);

  if (!bucket || now > bucket.resetAt) {
    trackingRateLimits.set(identifier, { attempts: 1, resetAt: now + 15 * 60 * 1000 }); // 15 mins window
    return true;
  }

  if (bucket.attempts >= 10) {
    return false; // Rate limit exceeded
  }

  bucket.attempts += 1;
  return true;
}

/**
 * Reissue a new tracking token for an existing permohonan.
 * Invalidates the previous token immediately by overwriting tracking_token_hash.
 *
 * Security:
 * - Only the authenticated owner or an administrator can reissue tokens.
 * - Logs audit record in log_aktivitas.
 * - Returns new plaintext token once.
 */
export async function reissueTrackingToken(
  permohonanId: string
): Promise<{ permohonan_id: string; tracking_token: string }> {
  const { user, profile } = await requireAuth();
  const adminClient = createAdminClient();

  // 1. Verify existence & ownership
  const { data: permohonan, error: fetchError } = await adminClient
    .from('permohonan')
    .select('id, pemohon_id, nomor_permohonan')
    .eq('id', permohonanId)
    .maybeSingle();

  if (fetchError || !permohonan) {
    throw new Error('Permohonan tidak ditemukan.');
  }

  const isAdmin = profile.role === 'admin';
  if (!isAdmin && permohonan.pemohon_id !== user.id) {
    throw new AuthError('FORBIDDEN', 'Akses ditolak: Anda bukan pemilik permohonan ini.');
  }

  // 2. Generate new CSPRNG token & HMAC hash
  const newToken = generateTrackingToken();
  const newHash = hashTrackingToken(newToken);

  // 3. Atomically overwrite hash in database
  const { error: updateError } = await adminClient
    .from('permohonan')
    .update({
      tracking_token_hash: newHash,
      updated_at: new Date().toISOString(),
    })
    .eq('id', permohonanId);

  if (updateError) {
    throw new Error(`Gagal memperbarui token tracking: ${updateError.message}`);
  }

  // 4. Record audit in log_aktivitas
  try {
    await adminClient.from('log_aktivitas').insert({
      actor_id: user.id,
      actor_role: profile.role,
      action: 'reissue_tracking_token',
      target_entity: 'permohonan',
      target_id: permohonanId,
      metadata: {
        nomor_permohonan: permohonan.nomor_permohonan,
      },
    });
  } catch (auditErr) {
    console.error('[AUDIT ERROR] Gagal mencatat log reissue tracking token:', auditErr);
  }

  return {
    permohonan_id: permohonanId,
    tracking_token: newToken,
  };
}

/**
 * Public tracking lookup using official number and secret token.
 *
 * Security Guarantees:
 * 1. Constant-time HMAC comparison (no timing side-channel leaks).
 * 2. Dummy computation when record is absent (prevents existence enumeration).
 * 3. Rate-limited to 10 attempts per 15 minutes per IP.
 * 4. Strictly returns PermohonanPublicTrackingDTO (NO PII, NO notes, NO hashes).
 */
export async function getPublicTrackingStatus(params: {
  nomorPermohonan: string;
  trackingToken: string;
  clientIp?: string;
}): Promise<PermohonanPublicTrackingDTO> {
  const { nomorPermohonan, trackingToken, clientIp } = params;
  const ipKey = clientIp || 'anonymous-client';

  // 1. Rate limiting check
  if (!checkTrackingRateLimit(ipKey)) {
    throw new Error('Terlalu banyak permintaan tracking. Silakan coba kembali dalam 15 menit.');
  }

  const cleanNomor = (nomorPermohonan || '').trim();
  const cleanToken = (trackingToken || '').trim();

  // 2. Validate input formats
  const isValidNomor = /^PPID-\d{4}-\d{5}$/.test(cleanNomor);
  const isValidToken = isValidTrackingTokenFormat(cleanToken);

  const adminClient = createAdminClient();

  // If format is invalid, execute dummy verification to balance timing and return generic error
  if (!isValidNomor || !isValidToken) {
    verifyTrackingToken(cleanToken || 'invalid', null);
    throw new Error('Nomor permohonan atau token tracking tidak valid.');
  }

  // 3. Query permohonan record
  const { data, error } = await adminClient
    .from('permohonan')
    .select('nomor_permohonan, status_proses, decision, alasan_penolakan, created_at, updated_at, nama_pemohon, tracking_token_hash')
    .eq('nomor_permohonan', cleanNomor)
    .maybeSingle();

  // 4. Constant-time verification (handles both match and null/not-found)
  const isVerified = verifyTrackingToken(cleanToken, data?.tracking_token_hash);

  if (!isVerified || !data) {
    throw new Error('Nomor permohonan atau token tracking tidak valid.');
  }

  // 5. Construct safe public tracking DTO
  return {
    nomor_permohonan: data.nomor_permohonan,
    status_proses: data.status_proses as any,
    decision: data.decision as any,
    alasan_penolakan: data.alasan_penolakan,
    tanggal_pengajuan: data.created_at,
    tanggal_pembaruan: data.updated_at,
    nama_pemohon_masked: maskApplicantName(data.nama_pemohon),
  };
}
