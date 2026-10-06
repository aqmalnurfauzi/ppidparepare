'use server';

import { requireAuth } from '@/lib/auth/session';

/**
 * Update authenticated user's own profile.
 * Strictly whitelist-only: full_name, phone_number, address.
 * Disallows updating: id, role, is_active, created_at, email.
 */
export async function updateOwnProfile(formData: FormData) {
  const { user, supabase } = await requireAuth();

  const fullName = formData.get('full_name') as string;
  const phoneNumber = formData.get('phone_number') as string;
  const address = formData.get('address') as string;

  const updatePayload: { full_name?: string; phone_number?: string; address?: string } = {};

  if (typeof fullName === 'string') updatePayload.full_name = fullName.trim();
  if (typeof phoneNumber === 'string') updatePayload.phone_number = phoneNumber.trim();
  if (typeof address === 'string') updatePayload.address = address.trim();

  const { error } = await supabase
    .from('user_profiles')
    .update(updatePayload)
    .eq('id', user.id);

  if (error) {
    return { error: `Gagal memperbarui profil: ${error.message}` };
  }

  return { success: 'Profil berhasil diperbarui.' };
}
