import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface UserProfile {
  id: string;
  role: 'user' | 'admin';
  is_active: boolean;
  full_name: string | null;
  phone_number: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export type AuthFailure = 
  | 'UNAUTHENTICATED'
  | 'ACCOUNT_DISABLED'
  | 'EMAIL_NOT_VERIFIED'
  | 'FORBIDDEN';

export class AuthError extends Error {
  code: AuthFailure;
  constructor(code: AuthFailure, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Get current authenticated user securely via Supabase Auth (cryptographic verification)
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

/**
 * Require an authenticated and active user session.
 * Primary server-side security boundary for Server Actions & Route Handlers.
 */
export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AuthError('UNAUTHENTICATED', 'Autentikasi diperlukan untuk melanjutkan.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new AuthError('UNAUTHENTICATED', 'Profil pengguna tidak ditemukan.');
  }

  if (!profile.is_active) {
    throw new AuthError('ACCOUNT_DISABLED', 'Akun Anda telah dinonaktifkan. Silakan hubungi admin PPID.');
  }

  return { user, profile: profile as UserProfile, supabase };
}

/**
 * Require an active administrator session.
 * Multi-admin peer verification. Enforces role === 'admin' & is_active === true.
 */
export async function requireAdmin() {
  const authContext = await requireAuth();

  if (authContext.profile.role !== 'admin') {
    throw new AuthError('FORBIDDEN', 'Akses ditolak: Operasi ini memerlukan izin administrator.');
  }

  return authContext;
}

/**
 * Require active verified user for sensitive private submissions (permohonan/keberatan).
 */
export async function requireVerifiedUser() {
  const authContext = await requireAuth();

  if (!authContext.user.email_confirmed_at) {
    throw new AuthError('EMAIL_NOT_VERIFIED', 'Harap lakukan verifikasi email Anda terlebih dahulu.');
  }

  return authContext;
}
