import 'server-only';

import { requireAuth, AuthError } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  LegacyClaimSchema,
  type LegacyClaimInput,
} from '@/lib/validations/claim';
import {
  checkClaimRateLimit,
  recordClaimFailure,
  resetClaimRateLimit,
  RATE_LIMIT_MAX_FAILURES,
  RATE_LIMIT_WINDOW_MS,
} from './rate-limit';

export {
  checkClaimRateLimit,
  recordClaimFailure,
  resetClaimRateLimit,
  RATE_LIMIT_MAX_FAILURES,
  RATE_LIMIT_WINDOW_MS,
};

/**
 * Claim ownership of a legacy permohonan migrated from the old PPID system.
 *
 * Security & Authorization:
 * 1. Requires authenticated session with confirmed email & active profile.
 * 2. Rate-limited to max 3 failed attempts per 15-minute window to prevent brute-forcing NIK/tickets.
 * 3. Matching requires exact tuple: (legacyId [p_tiket_id or nomor_permohonan], NIK, tanggal).
 * 4. Permohonan MUST have pemohon_id IS NULL (cannot hijack existing owner's permohonan).
 * 5. Atomic link: UPDATE permohonan SET pemohon_id = user.id WHERE id = ... AND pemohon_id IS NULL.
 * 6. Audit logged in log_aktivitas for success, failure, and rate limiting.
 */
export async function claimLegacyPermohonan(
  rawInput: unknown,
  clientIp?: string
): Promise<{
  success: boolean;
  permohonanId?: string;
  nomorPermohonan?: string;
  error?: string;
}> {
  try {
    const input: LegacyClaimInput = LegacyClaimSchema.parse(rawInput);
    const { user, profile } = await requireAuth();

    const rateLimitKey = `claim_${user.id}_${clientIp || 'local'}`;
    const rateCheck = checkClaimRateLimit(rateLimitKey);

    if (!rateCheck.allowed) {
      // Audit rate limit hit
      try {
        const adminClient = createAdminClient();
        await adminClient.from('log_aktivitas').insert({
          actor_id: user.id,
          actor_role: profile.role,
          action: 'legacy_claim.rate_limited',
          target_entity: 'permohonan',
          target_id: input.legacyId,
          metadata: { ip: clientIp },
        });
      } catch {
        // Non-blocking
      }

      return {
        success: false,
        error: 'Terlalu banyak percobaan gagal. Silakan coba lagi setelah 15 menit.',
      };
    }

    const adminClient = createAdminClient();

    // 1. Search for legacy record matching legacyId and NIK
    const { data: candidate, error: searchError } = await adminClient
      .from('permohonan')
      .select('id, nomor_permohonan, pemohon_id, nik, created_at, p_tiket_id')
      .or(`p_tiket_id.eq.${input.legacyId},nomor_permohonan.eq.${input.legacyId}`)
      .eq('nik', input.nik)
      .maybeSingle();

    if (searchError || !candidate) {
      recordClaimFailure(rateLimitKey);
      try {
        await adminClient.from('log_aktivitas').insert({
          actor_id: user.id,
          actor_role: profile.role,
          action: 'legacy_claim.failed',
          target_entity: 'permohonan',
          target_id: input.legacyId,
          metadata: { reason: 'not_found_or_nik_mismatch' },
        });
      } catch {
        // Non-blocking
      }

      return {
        success: false,
        error: 'Data permohonan lama tidak ditemukan atau informasi verifikasi tidak cocok.',
      };
    }

    // 2. Verify submission date (created_at date prefix)
    const recordDate = new Date(candidate.created_at).toISOString().split('T')[0];
    if (recordDate !== input.tanggalPengajuan) {
      recordClaimFailure(rateLimitKey);
      try {
        await adminClient.from('log_aktivitas').insert({
          actor_id: user.id,
          actor_role: profile.role,
          action: 'legacy_claim.failed',
          target_entity: 'permohonan',
          target_id: candidate.id,
          metadata: { reason: 'date_mismatch' },
        });
      } catch {
        // Non-blocking
      }

      return {
        success: false,
        error: 'Data permohonan lama tidak ditemukan atau informasi verifikasi tidak cocok.',
      };
    }

    // 3. Prevent hijacking: permohonan must not have an existing owner
    if (candidate.pemohon_id !== null && candidate.pemohon_id !== undefined) {
      recordClaimFailure(rateLimitKey);
      try {
        await adminClient.from('log_aktivitas').insert({
          actor_id: user.id,
          actor_role: profile.role,
          action: 'legacy_claim.already_claimed',
          target_entity: 'permohonan',
          target_id: candidate.id,
          metadata: { reason: 'already_linked' },
        });
      } catch {
        // Non-blocking
      }

      return {
        success: false,
        error: 'Permohonan ini sudah terhubung dengan akun pengguna.',
      };
    }

    // 4. Atomic link: update pemohon_id where pemohon_id IS NULL
    const { data: updated, error: updateError } = await adminClient
      .from('permohonan')
      .update({ pemohon_id: user.id })
      .eq('id', candidate.id)
      .is('pemohon_id', null)
      .select('id, nomor_permohonan')
      .maybeSingle();

    if (updateError || !updated) {
      return {
        success: false,
        error: `Gagal menghubungkan permohonan: ${updateError?.message || 'Konflik konkurensi'}`,
      };
    }

    // 5. Successful claim: reset rate limit counter
    resetClaimRateLimit(rateLimitKey);

    // 6. Record audit trail
    try {
      await adminClient.from('log_aktivitas').insert({
        actor_id: user.id,
        actor_role: profile.role,
        action: 'legacy_claim.success',
        target_entity: 'permohonan',
        target_id: candidate.id,
        metadata: {
          legacy_id: input.legacyId,
          nomor_permohonan: candidate.nomor_permohonan,
        },
      });
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      permohonanId: updated.id,
      nomorPermohonan: updated.nomor_permohonan,
    };
  } catch (err: any) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan sistem.' };
  }
}
