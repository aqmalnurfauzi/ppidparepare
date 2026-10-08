import 'server-only';

import { requireAdmin, AuthError } from '@/lib/auth/session';
import {
  AdminWorkflowUpdateSchema,
  type AdminWorkflowUpdateInput,
} from '@/lib/validations/workflow';

/**
 * Execute an administrative workflow update on a permohonan.
 *
 * Security & Integrity:
 * 1. Enforces requireAdmin() session (role === 'admin' && is_active === true).
 * 2. Enforces State Machine invariants through Zod schema.
 * 3. Calls atomic SECURITY DEFINER RPC public.admin_update_permohonan_workflow.
 * 4. Database RPC performs row locking, updates permohonan, and writes audit record in log_aktivitas.
 */
export async function executeAdminWorkflowUpdate(
  rawInput: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const input: AdminWorkflowUpdateInput = AdminWorkflowUpdateSchema.parse(rawInput);
    const { supabase } = await requireAdmin();

    const { error: rpcError } = await supabase.rpc('admin_update_permohonan_workflow', {
      p_permohonan_id: input.permohonanId,
      p_status_proses: input.statusProses,
      p_decision: input.decision || null,
      p_alasan_penolakan: input.alasanPenolakan || null,
      p_catatan_internal: input.catatanInternal || null,
    });

    if (rpcError) {
      if (rpcError.code === 'P0002') {
        return { success: false, error: 'Permohonan tidak ditemukan.' };
      }
      if (rpcError.code === '42501') {
        return { success: false, error: 'Akses ditolak: Hanya administrator yang dapat memperbarui workflow.' };
      }
      return { success: false, error: `Gagal memperbarui status permohonan: ${rpcError.message}` };
    }

    return { success: true };
  } catch (err: any) {
    if (err instanceof AuthError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: err?.message || 'Terjadi kesalahan validasi atau server.' };
  }
}
