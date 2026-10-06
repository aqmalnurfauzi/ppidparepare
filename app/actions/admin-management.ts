'use server';

import { requireAdmin } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Privileged Admin Invitation Workflow
 * Strictly checks caller is an active administrator.
 * Never accepts role parameter from client - hardcoded to 'admin'.
 * Performs out-of-band audit logging.
 */
export async function inviteAdmin(formData: FormData) {
  // 1. Verify caller authority (active admin)
  const { user: callerUser, profile: callerProfile } = await requireAdmin();

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const fullName = (formData.get('full_name') as string)?.trim();

  if (!email || !email.includes('@')) {
    return { error: 'Alamat email valid diperlukan.' };
  }

  const adminClient = createAdminClient();

  // 2. Invite user via Supabase Auth Admin API
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName || 'Administrator PPID',
    },
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard`,
  });

  if (inviteError || !inviteData.user) {
    return { error: `Gagal mengirim undangan admin: ${inviteError?.message || 'Unknown error'}` };
  }

  const newAdminId = inviteData.user.id;

  // 3. Elevate to admin role in authoritative user_profiles table
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .update({
      role: 'admin',
      is_active: true,
      full_name: fullName || 'Administrator PPID',
      updated_at: new Date().toISOString(),
    })
    .eq('id', newAdminId);

  if (profileError) {
    // If profile didn't exist yet, insert with admin role
    await adminClient.from('user_profiles').insert({
      id: newAdminId,
      role: 'admin',
      is_active: true,
      full_name: fullName || 'Administrator PPID',
    });
  }

  // 4. Record audit trail
  try {
    await adminClient.from('log_aktivitas').insert({
      user_name: callerProfile.full_name || callerUser.email || 'Admin',
      aksi: 'INVITE_ADMIN',
      detail: `Mengundang administrator baru: ${email} (ID: ${newAdminId})`,
      waktu: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal for invitation, but noted
    console.error('Audit log failed:', err);
  }

  return { success: `Undangan administrator berhasil dikirim ke ${email}.` };
}

/**
 * Toggle user or admin active status (Suspend / Reactivate)
 * Enforces admin peer protections:
 * - Admin cannot deactivate themselves.
 * - Cannot deactivate last remaining active admin.
 */
export async function toggleUserStatus(targetUserId: string, targetActive: boolean) {
  const { user: callerUser, profile: callerProfile } = await requireAdmin();

  if (targetUserId === callerUser.id && !targetActive) {
    return { error: 'Anda tidak dapat menonaktifkan akun administrator Anda sendiri.' };
  }

  const adminClient = createAdminClient();

  // Fetch target profile
  const { data: targetProfile, error: targetError } = await adminClient
    .from('user_profiles')
    .select('id, role, is_active, full_name')
    .eq('id', targetUserId)
    .single();

  if (targetError || !targetProfile) {
    return { error: 'Pengguna target tidak ditemukan.' };
  }

  // If target is admin and we are deactivating, verify there is at least 1 other active admin
  if (targetProfile.role === 'admin' && !targetActive) {
    const { count, error: countError } = await adminClient
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    if (countError || (count !== null && count <= 1)) {
      return { error: 'Operasi ditolak: Sistem harus memiliki setidaknya satu administrator aktif.' };
    }
  }

  // Execute status update
  const { error: updateError } = await adminClient
    .from('user_profiles')
    .update({
      is_active: targetActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId);

  if (updateError) {
    return { error: `Gagal memperbarui status pengguna: ${updateError.message}` };
  }

  // Record audit log
  try {
    await adminClient.from('log_aktivitas').insert({
      user_name: callerProfile.full_name || callerUser.email || 'Admin',
      aksi: targetActive ? 'ACTIVATE_ACCOUNT' : 'DEACTIVATE_ACCOUNT',
      detail: `Status pengguna ${targetProfile.full_name || targetUserId} diubah menjadi ${targetActive ? 'Aktif' : 'Nonaktif'}`,
      waktu: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }

  return { success: `Status pengguna berhasil diperbarui menjadi ${targetActive ? 'Aktif' : 'Nonaktif'}.` };
}
