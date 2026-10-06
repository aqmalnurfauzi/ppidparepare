'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Email atau password salah!' };
  }

  // Next.js middleware handles routing if they are admin vs user, 
  // but we can redirect safely to /dashboard or /profil. Middleware will adjust if needed.
  redirect('/dashboard');
}

export async function register(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('full_name') as string;

  if (!email || !password || !fullName) {
    return { error: 'Semua kolom wajib diisi.' };
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
  
  if (!newPassword || newPassword.length < 6) {
    return { error: 'Password baru minimal 6 karakter.' };
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
