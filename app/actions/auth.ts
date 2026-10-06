'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { validatePassword } from '@/lib/auth/password';
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from '@/lib/auth/rate-limit';

/**
 * Mendapatkan IP Address (atau fallback) untuk keperluan rate limiting.
 */
async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown-ip';
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  // 1. Rate Limit Check
  const ip = await getClientIp();
  // Kombinasi IP dan Email mencegah serangan terdistribusi maupun DoS targeted account
  const rateLimitKey = `${ip}:${email}`;

  const check = checkLoginRateLimit(rateLimitKey);
  if (!check.allowed) {
    // Response generik untuk rate limit
    return { error: 'Terlalu banyak percobaan login yang gagal. Silakan coba lagi dalam beberapa menit.' };
  }

  // 2. Auth execution
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // 3. Catat percobaan gagal
    recordFailedLogin(rateLimitKey);
    // Response generik gagal login
    return { error: 'Email atau password salah!' };
  }

  // 4. Reset counter jika berhasil
  resetLoginRateLimit(rateLimitKey);

  // Next.js middleware handles routing if they are admin vs user
  redirect('/dashboard');
}

export async function register(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  if (!email || !password || !fullName) {
    return { error: 'Semua kolom wajib diisi.' };
  }

  // Enforce password policy
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return { error: passwordCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`,
    }
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Registrasi berhasil. Silakan cek email Anda untuk verifikasi.' };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email wajib diisi.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Tautan reset password telah dikirim ke email Anda.' };
}

export async function updatePassword(formData: FormData) {
  const newPassword = formData.get('password') as string;

  // Enforce password policy
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.valid) {
    return { error: passwordCheck.error };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/login?message=password_updated');
}
