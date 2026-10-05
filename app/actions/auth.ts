'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_COOKIE_NAME = 'admin_session_token';

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return { error: 'Konfigurasi server bermasalah. Kredensial tidak ditemukan.' };
  }

  // Artificial delay to prevent timing and basic brute-force attacks
  await new Promise(resolve => setTimeout(resolve, 800));

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Generate a simple token (in production, use a secure signed JWT)
    const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
    
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    redirect('/dashboard');
  }

  return { error: 'Username atau Password salah!' };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/login');
}
