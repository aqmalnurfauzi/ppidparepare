import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { UserProfile } from './session';

export const GUEST_APPLICANT_EMAIL =
  process.env.PPID_GUEST_APPLICANT_EMAIL || 'guest.applicant@ppid.pareparekota.go.id';
export const GUEST_APPLICANT_PASSWORD =
  process.env.PPID_GUEST_APPLICANT_PASSWORD || '';

/**
 * Provides an authenticated Supabase client for public applicants without mandatory login.
 * Citizens who submit FOI requests without creating personal login accounts execute via
 * this secure public gateway identity (role='user', confirmed email) so database RLS,
 * counter locks, and immutability triggers function without bypassing security.
 */
export async function getGuestApplicantClient(): Promise<{
  user: { id: string; email?: string };
  profile: UserProfile;
  supabase: any;
}> {
  if (!GUEST_APPLICANT_PASSWORD) {
    throw new Error('Kredensial PPID_GUEST_APPLICANT_PASSWORD belum disetel di server environment.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('Konfigurasi Supabase tidak lengkap di environment server.');
  }

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: GUEST_APPLICANT_EMAIL,
    password: GUEST_APPLICANT_PASSWORD,
  });

  if (error || !data.user) {
    console.error('[GUEST GATEWAY ERROR] Sign-in guest applicant gagal:', error?.message);
    throw new Error('Gateway pemohon publik sedang tidak tersedia. Silakan hubungi admin PPID.');
  }

  const profile: UserProfile = {
    id: data.user.id,
    role: 'user',
    is_active: true,
    full_name: 'Pemohon Publik PPID (Tamu)',
    phone_number: null,
    address: null,
    created_at: data.user.created_at,
    updated_at: new Date().toISOString(),
  };

  return {
    user: data.user,
    profile,
    supabase: client,
  };
}
