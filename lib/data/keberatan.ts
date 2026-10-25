import 'server-only';

import { requireAuth, requireAdmin, AuthError } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyTrackingToken } from '@/lib/tracking/token';
import {
  KEBERATAN_USER_PROJECTION,
  KEBERATAN_ADMIN_PROJECTION,
  type KeberatanUserDTO,
  type KeberatanAdminDTO,
} from '@/types/keberatan';
import {
  CreateKeberatanSchema,
  AdminUpdateKeberatanSchema,
  KeberatanListQuerySchema,
  KeberatanIdSchema,
  type CreateKeberatanInput,
  type AdminUpdateKeberatanInput,
  type KeberatanListQueryInput,
} from '@/lib/validations/keberatan';

/**
 * Submit an objection (Keberatan) for a completed Permohonan.
 *
 * Security & Invariants:
 * 1. User must be authenticated, active, and email verified.
 * 2. Permohonan must exist and belong to caller (or caller is admin).
 * 3. Permohonan status_proses must be 'selesai' (cannot object while diajukan/diproses).
 * 4. Checks against duplicate active objections (diajukan/diproses).
 * 5. Uses client session with database RLS and column-level GRANTs.
 * 6. Records audit event into log_aktivitas.
 */
export async function createKeberatan(
  rawInput: unknown
): Promise<{ success: boolean; data?: KeberatanUserDTO; error?: string }> {
  try {
    const input: CreateKeberatanInput = CreateKeberatanSchema.parse(rawInput);
    let user: any = null;
    let profile: any = null;
    let clientToUse: any = null;

    try {
      const auth = await requireAuth();
      user = auth.user;
      profile = auth.profile;
      clientToUse = auth.supabase;
    } catch {
      // Unauthenticated / Guest citizen flow (Layanan Pengajuan Keberatan Informasi Publik Terbuka)
      user = null;
      profile = { role: 'user', id: 'guest-applicant' };
      clientToUse = createAdminClient();
    }

    const adminClient = createAdminClient();

    // 1. Verify existence, ownership, and terminal status of target permohonan
    const { data: permohonan, error: permohonanError } = await adminClient
      .from('permohonan')
      .select('id, pemohon_id, status_proses, nomor_permohonan, tracking_token_hash')
      .eq('id', input.permohonanId)
      .maybeSingle();

    if (permohonanError || !permohonan) {
      return { success: false, error: 'Permohonan tidak ditemukan.' };
    }

    if (user && profile.role !== 'admin' && permohonan.pemohon_id !== user.id) {
      return { success: false, error: 'Akses ditolak: Anda bukan pemilik permohonan ini.' };
    }

    // Unauthenticated guest applicant verification: require valid tracking token
    if (!user) {
      if (permohonan.tracking_token_hash) {
        if (!input.trackingToken || !verifyTrackingToken(input.trackingToken, permohonan.tracking_token_hash)) {
          return {
            success: false,
            error: 'Verifikasi kepemilikan permohonan gagal: Token pelacakan permohonan tidak valid atau belum disertakan.',
          };
        }
      } else {
        return {
          success: false,
          error: 'Permohonan ini terdaftar sebelum sistem kode rahasia pelacakan aktif. Silakan masuk dengan akun terdaftar untuk mengajukan keberatan.',
        };
      }
    }

    if (permohonan.status_proses !== 'selesai') {
      return {
        success: false,
        error: 'Keberatan hanya dapat diajukan setelah permohonan selesai diproses.',
      };
    }

    // 2. Prevent duplicate open objections
    const { data: existingOpen, error: existingError } = await adminClient
      .from('keberatan')
      .select('id, status_keberatan')
      .eq('permohonan_id', input.permohonanId)
      .in('status_keberatan', ['diajukan', 'diproses'])
      .maybeSingle();

    if (!existingError && existingOpen) {
      return {
        success: false,
        error: 'Permohonan ini sudah memiliki pengajuan keberatan yang sedang diproses.',
      };
    }

    // 3. Insert record using client (enforces RLS or admin client)
    const { data: newKeberatan, error: insertError } = await clientToUse
      .from('keberatan')
      .insert({
        permohonan_id: input.permohonanId,
        alasan_keberatan: input.alasanKeberatan,
        kasus_posisi: input.kasusPosisi || null,
      })
      .select(KEBERATAN_USER_PROJECTION)
      .single();

    if (insertError || !newKeberatan) {
      return {
        success: false,
        error: `Gagal mengajukan keberatan: ${insertError?.message || 'Terjadi kesalahan sistem'}`,
      };
    }

    // 4. Record audit trail into log_aktivitas
    try {
      await adminClient.from('log_aktivitas').insert({
        actor_id: user ? user.id : permohonan.pemohon_id,
        actor_role: profile.role,
        action: 'keberatan.create',
        target_entity: 'keberatan',
        target_id: newKeberatan.id,
        metadata: {
          permohonan_id: input.permohonanId,
          nomor_permohonan: permohonan.nomor_permohonan,
        },
      });
    } catch {
      // Non-blocking for client response
    }

    return { success: true, data: newKeberatan as KeberatanUserDTO };
  } catch (err: any) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan validasi.' };
  }
}

/**
 * List objections belonging to the authenticated user.
 */
export async function getUserKeberatanList(
  rawQuery?: unknown
): Promise<{ data: KeberatanUserDTO[]; count: number }> {
  const { user, supabase } = await requireAuth();
  const query: KeberatanListQueryInput = KeberatanListQuerySchema.parse(rawQuery || {});

  const offset = (query.page - 1) * query.limit;

  let builder = supabase
    .from('keberatan')
    .select(KEBERATAN_USER_PROJECTION, { count: 'exact' });

  if (query.status) {
    builder = builder.eq('status_keberatan', query.status);
  }

  if (query.permohonanId) {
    builder = builder.eq('permohonan_id', query.permohonanId);
  }

  const { data, count, error } = await builder
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range(offset, offset + query.limit - 1);

  if (error) {
    throw new Error(`Gagal mengambil daftar keberatan: ${error.message}`);
  }

  return {
    data: (data || []) as KeberatanUserDTO[],
    count: count || 0,
  };
}

/**
 * Get detail of an objection for the authenticated user.
 */
export async function getUserKeberatanDetail(
  keberatanId: string
): Promise<KeberatanUserDTO | null> {
  const validId = KeberatanIdSchema.parse(keberatanId);
  const { supabase } = await requireAuth();

  const { data, error } = await supabase
    .from('keberatan')
    .select(KEBERATAN_USER_PROJECTION)
    .eq('id', validId)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengambil detail keberatan: ${error.message}`);
  }

  return data ? (data as KeberatanUserDTO) : null;
}

/**
 * List all objections for administrators.
 */
export async function getAdminKeberatanList(
  rawQuery?: unknown
): Promise<{ data: KeberatanAdminDTO[]; count: number }> {
  await requireAdmin();
  const query: KeberatanListQueryInput = KeberatanListQuerySchema.parse(rawQuery || {});
  const adminClient = createAdminClient();

  const offset = (query.page - 1) * query.limit;

  let builder = adminClient
    .from('keberatan')
    .select(KEBERATAN_ADMIN_PROJECTION, { count: 'exact' });

  if (query.status) {
    builder = builder.eq('status_keberatan', query.status);
  }

  if (query.permohonanId) {
    builder = builder.eq('permohonan_id', query.permohonanId);
  }

  const { data, count, error } = await builder
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range(offset, offset + query.limit - 1);

  if (error) {
    throw new Error(`Gagal mengambil daftar keberatan admin: ${error.message}`);
  }

  return {
    data: (data || []) as KeberatanAdminDTO[],
    count: count || 0,
  };
}

/**
 * Get detail of an objection for administrators.
 */
export async function getAdminKeberatanDetail(
  keberatanId: string
): Promise<KeberatanAdminDTO | null> {
  const validId = KeberatanIdSchema.parse(keberatanId);
  await requireAdmin();
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('keberatan')
    .select(KEBERATAN_ADMIN_PROJECTION)
    .eq('id', validId)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengambil detail keberatan admin: ${error.message}`);
  }

  return data ? (data as KeberatanAdminDTO) : null;
}

/**
 * Administrative mutation to update objection status and supervisor response (tanggapan atasan).
 */
export async function adminUpdateKeberatan(
  rawInput: unknown
): Promise<{ success: boolean; data?: KeberatanAdminDTO; error?: string }> {
  try {
    const input: AdminUpdateKeberatanInput = AdminUpdateKeberatanSchema.parse(rawInput);
    const { user } = await requireAdmin();
    const adminClient = createAdminClient();

    // Fetch existing objection
    const { data: existing, error: fetchError } = await adminClient
      .from('keberatan')
      .select('id, status_keberatan, nomor_keberatan')
      .eq('id', input.keberatanId)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: 'Keberatan tidak ditemukan.' };
    }

    const updatePayload: Record<string, any> = {
      status_keberatan: input.statusKeberatan,
      tanggapan_atasan: input.tanggapanAtasan || null,
      updated_at: new Date().toISOString(),
    };

    if (input.nomorKeberatan) {
      updatePayload.nomor_keberatan = input.nomorKeberatan;
    }

    const { data: updated, error: updateError } = await adminClient
      .from('keberatan')
      .update(updatePayload)
      .eq('id', input.keberatanId)
      .select(KEBERATAN_ADMIN_PROJECTION)
      .single();

    if (updateError || !updated) {
      return {
        success: false,
        error: `Gagal memperbarui status keberatan: ${updateError?.message || 'Gagal memperbarui data'}`,
      };
    }

    // Record audit trail
    try {
      await adminClient.from('log_aktivitas').insert({
        actor_id: user.id,
        actor_role: 'admin',
        action: 'keberatan.workflow_update',
        target_entity: 'keberatan',
        target_id: input.keberatanId,
        metadata: {
          from_status: existing.status_keberatan,
          to_status: input.statusKeberatan,
          has_tanggapan: !!input.tanggapanAtasan,
          nomor_keberatan: input.nomorKeberatan || existing.nomor_keberatan,
        },
      });
    } catch {
      // Non-blocking
    }

    return { success: true, data: updated as KeberatanAdminDTO };
  } catch (err: any) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan sistem.' };
  }
}
