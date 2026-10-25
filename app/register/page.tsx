import { redirect } from 'next/navigation';

/**
 * Halaman Registrasi Warga dialihkan langsung ke Formulir Permohonan Informasi Publik.
 * Warga PPID Kota Parepare tidak memerlukan akun otentikasi login, melainkan langsung
 * mengisi formulir pendaftaran permohonan informasi dan berkas identitas di /ajukan-permohonan.
 */
export default function RegisterPage() {
  redirect('/ajukan-permohonan');
}
