'use server';

import { supabase } from './supabase';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/session';
import { maskApplicantName, type SafePublicTrackingResult } from '@/types/permohonan';
import { verifyTrackingToken } from '@/lib/tracking/token';
import { checkTrackingRateLimit } from '@/lib/tracking/service';
import { 
  DataInformasi, 
  defaultBerita, 
  defaultInformasiPublik, 
  defaultFAQs,
  defaultSejarah,
  defaultVisi,
  defaultMisi,
  defaultSejarahKepala,
  defaultStrukturOrganisasi,
  defaultStrukturKUA,
  defaultStrukturMadrasah,
  defaultMaklumat
} from './data';

export async function getBerita() {
  try {
    const { data, error } = await supabase.from('berita').select('*').order('tanggal', { ascending: false });
    if (error) throw error;
    if (data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        slug: row.slug,
        date: row.tanggal,
        imageUrl: row.image_url,
        title: row.title,
        summary: row.summary,
        content: row.content,
        status: row.status || 'Published',
        views: typeof row.views === 'number' ? row.views : 0,
      }));
    }
    return defaultBerita.map((b: any) => ({ ...b, views: b.views || 0 }));
  } catch (error) {
    console.error('Error fetching berita:', error);
    return defaultBerita.map((b: any) => ({ ...b, views: b.views || 0 }));
  }
}

export async function getBeritaBySlug(slug: string) {
  try {
    const { data, error } = await supabase.from('berita').select('*').eq('slug', slug).single();
    if (error || !data) {
      const fallback = defaultBerita.find((b: any) => b.slug === slug);
      return fallback ? { ...fallback, views: (fallback as any).views || 0 } : null;
    }
    return {
      id: data.id,
      slug: data.slug,
      date: data.tanggal,
      imageUrl: data.image_url,
      title: data.title,
      summary: data.summary,
      content: data.content,
      status: data.status || 'Published',
      views: typeof data.views === 'number' ? data.views : 0,
    };
  } catch (error) {
    console.error('Error fetching berita by slug:', error);
    const fallback = defaultBerita.find((b: any) => b.slug === slug);
    return fallback ? { ...fallback, views: (fallback as any).views || 0 } : null;
  }
}

export async function incrementBeritaViews(slug: string) {
  try {
    if (!slug) return { success: false, error: 'Slug tidak boleh kosong' };
    
    // Panggil fungsi RPC atomic di Supabase
    const { error } = await supabase.rpc('increment_berita_views', { berita_slug: slug });
    if (error) {
      // Fallback: update manual jika RPC gagal
      const { data: row } = await supabase.from('berita').select('views').eq('slug', slug).single();
      const currentViews = row?.views || 0;
      await supabase.from('berita').update({ views: currentViews + 1 }).eq('slug', slug);
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error incrementing berita views:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function createBerita(data: any) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const tanggalFormatted = data.tanggal ? data.tanggal.split('T')[0] : new Date().toISOString().split('T')[0];
    
    let summaryText = data.summary?.trim() || '';
    if (!summaryText && data.content) {
      const plainText = data.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      summaryText = plainText.slice(0, 180) + (plainText.length > 180 ? '...' : '');
    }

    const viewsCount = data.views !== undefined && data.views !== '' ? (parseInt(data.views, 10) || 0) : 0;

    const payload: any = {
      title: data.title ? data.title.trim() : 'Berita Tanpa Judul',
      summary: summaryText,
      content: data.content ? data.content.trim() : '',
      image_url: data.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800',
      slug: data.slug || `${Date.now()}-${(data.title || 'berita').toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      tanggal: tanggalFormatted,
      views: viewsCount
    };

    if (data.status) {
      payload.status = data.status;
    }

    let { data: result, error } = await adminClient.from('berita').insert([payload]).select();
    
    // Jika error karena kolom status belum ada di tabel berita, coba insert tanpa kolom status
    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await adminClient.from('berita').insert([payload]).select();
      result = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error creating berita:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function updateBerita(id: string, data: any) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const payload: any = { ...data };
    if (payload.tanggal && payload.tanggal.includes('T')) {
      payload.tanggal = payload.tanggal.split('T')[0];
    }
    if (payload.imageUrl) {
      payload.image_url = payload.imageUrl;
      delete payload.imageUrl;
    }
    if (!payload.summary && payload.content) {
      const plainText = payload.content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      payload.summary = plainText.slice(0, 180) + (plainText.length > 180 ? '...' : '');
    }
    if (data.views !== undefined && data.views !== '') {
      payload.views = parseInt(data.views, 10) || 0;
    }

    let { data: result, error } = await adminClient.from('berita').update(payload).eq('id', id).select();
    
    // Fallback jika kolom status belum ada di DB
    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await adminClient.from('berita').update(payload).eq('id', id).select();
      result = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating berita:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function deleteBerita(id: string) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('berita').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting berita:', error);
    return { success: false, error: error?.message || 'Gagal menghapus berita' };
  }
}

export async function getInformasiPublik(): Promise<DataInformasi[]> {
  try {
    const { data, error } = await supabase.from('informasi_publik').select('*').order('tahun', { ascending: false }).order('judul', { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) {
      return data.map((row: any) => ({
        id: row.id,
        judul: row.judul,
        kategori: row.kategori,
        deskripsi: row.deskripsi,
        tanggal_update: row.tanggal_update,
        tahun: row.tahun,
        link_download: row.link_download,
        tipe_file: row.tipe_file,
        ukuran: row.ukuran,
        status: row.status || 'Aktif',
      }));
    }
    return defaultInformasiPublik;
  } catch (error) {
    console.error('Error fetching informasi publik:', error);
    return defaultInformasiPublik;
  }
}

function normalizeKategori(kategori: string): 'Berkala' | 'Setiap Saat' | 'Serta Merta' | 'Dikecualikan' {
  const lower = (kategori || '').toLowerCase().trim();
  if (lower.includes('berkala')) return 'Berkala';
  if (lower.includes('serta')) return 'Serta Merta';
  if (lower.includes('saat')) return 'Setiap Saat';
  if (lower.includes('kecuali')) return 'Dikecualikan';
  return 'Berkala';
}

export async function createInformasiPublik(data: any) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const tanggalFormatted = data.tanggal_update ? data.tanggal_update.split('T')[0] : new Date().toISOString().split('T')[0];
    const docId = data.id || `INF-${Date.now().toString().slice(-6)}`;
    
    const payload: any = {
      id: docId,
      judul: data.judul,
      kategori: normalizeKategori(data.kategori),
      deskripsi: data.deskripsi || '',
      tahun: parseInt(data.tahun) || new Date().getFullYear(),
      tanggal_update: tanggalFormatted,
      link_download: data.link_download || '#',
      tipe_file: data.tipe_file || 'PDF',
      ukuran: data.ukuran || '1.0 MB'
    };

    if (data.status) {
      payload.status = data.status;
    }

    let { data: result, error } = await adminClient.from('informasi_publik').insert([payload]).select();

    // Fallback jika kolom status belum ada di DB
    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await adminClient.from('informasi_publik').insert([payload]).select();
      result = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error creating informasi publik:', error);
    return { success: false, error: error?.message || error };
  }
}

export async function updateInformasiPublik(id: string, data: any) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const payload: any = { ...data };
    if (payload.kategori) {
      payload.kategori = normalizeKategori(payload.kategori);
    }
    if (payload.tanggal_update && payload.tanggal_update.includes('T')) {
      payload.tanggal_update = payload.tanggal_update.split('T')[0];
    }

    let { data: result, error } = await adminClient.from('informasi_publik').update(payload).eq('id', id).select();

    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await adminClient.from('informasi_publik').update(payload).eq('id', id).select();
      result = retry.data;
      error = retry.error;
    }

    if (error) throw error;
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating informasi publik:', error);
    return { success: false, error: error?.message || error };
  }
}

export async function deleteInformasiPublik(id: string) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('informasi_publik').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting informasi publik:', error);
    return { success: false, error: error?.message || 'Gagal menghapus informasi publik' };
  }
}

export async function getFAQs() {
  try {
    const { data, error } = await supabase.from('faqs').select('*').order('id', { ascending: true });
    if (error) throw error;
    if (data && data.length > 0) return data;
    return defaultFAQs;
  } catch (error) {
    console.error('Error fetching faqs:', error);
    return defaultFAQs;
  }
}

export async function addFaq(data: { question: string, answer: string }) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('faqs').insert([data]);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error adding faq:', error);
    return { success: false, error: error?.message || 'Gagal menambahkan FAQ' };
  }
}

export async function updateFaq(id: number, data: { question: string, answer: string }) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('faqs').update(data).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating faq:', error);
    return { success: false, error: error?.message || 'Gagal mengubah FAQ' };
  }
}

export async function deleteFaq(id: number) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('faqs').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting faq:', error);
    return { success: false, error: error?.message || 'Gagal menghapus FAQ' };
  }
}

export async function getGaleri() {
  try {
    const { data, error } = await supabase.from('galeri').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching galeri:', error);
    return [];
  }
}

export async function getRegulasi() {
  try {
    const { data, error } = await supabase.from('regulasi').select('*').order('year', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching regulasi:', error);
    return [];
  }
}

export async function getPermohonan() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('permohonan')
      .select('id, nomor_permohonan, status_proses, decision, alasan_penolakan, nama_pemohon, kategori_pemohon, nik, instansi, alamat, telepon, email, kebutuhan, tujuan_penggunaan, cara_memperoleh_informasi, cara_mendapatkan_salinan, catatan_internal, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
      ...row,
      status: row.status_proses,
      tanggal: row.created_at ? row.created_at.split('T')[0] : '',
      nama: row.nama_pemohon,
    }));
  } catch (error) {
    console.error('Error fetching permohonan:', error);
    return [];
  }
}

export async function updatePermohonanStatus(id: string, status: string) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const validStatuses = ['diajukan', 'diproses', 'selesai'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Status tidak valid.' };
    }

    const { error } = await adminClient
      .from('permohonan')
      .update({
        status_proses: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating permohonan status:', error);
    return { success: false, error: error.message || 'Gagal mengubah status permohonan' };
  }
}

export async function updatePermohonanInternalNotes(id: string, notes: string) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('permohonan')
      .update({
        catatan_internal: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating permohonan internal notes:', error);
    return { success: false, error: error.message || 'Gagal menyimpan catatan internal' };
  }
}

export async function getKeberatan() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('keberatan')
      .select(`
        id,
        permohonan_id,
        nomor_keberatan,
        alasan_keberatan,
        kasus_posisi,
        status_keberatan,
        tanggapan_atasan,
        created_at,
        updated_at,
        permohonan:permohonan_id (
          id,
          nomor_permohonan,
          nama_pemohon,
          email
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => {
      const perm = row.permohonan || {};
      return {
        id: row.id,
        permohonan_id: row.permohonan_id,
        nomor_keberatan: row.nomor_keberatan || row.id,
        nomor_permohonan: perm.nomor_permohonan || '-',
        nama_pemohon: perm.nama_pemohon || '-',
        nama: perm.nama_pemohon || '-',
        email_pemohon: perm.email || '-',
        alasan_keberatan: row.alasan_keberatan,
        alasan: row.alasan_keberatan,
        kasus_posisi: row.kasus_posisi,
        status_keberatan: row.status_keberatan,
        status: row.status_keberatan,
        tanggapan_atasan: row.tanggapan_atasan,
        tanggapan: row.tanggapan_atasan,
        created_at: row.created_at,
        tanggal: row.created_at ? row.created_at.split('T')[0] : '',
        updated_at: row.updated_at,
      };
    });
  } catch (error) {
    console.error('Error fetching keberatan:', error);
    return [];
  }
}

export async function updateKeberatanStatus(id: string, status: string, tanggapan?: string) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const updateData: any = {
      status_keberatan: status,
      updated_at: new Date().toISOString(),
    };
    if (tanggapan !== undefined) {
      updateData.tanggapan_atasan = tanggapan;
    }
    const { error } = await adminClient.from('keberatan').update(updateData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating keberatan status:', error);
    return { success: false, error: error.message || 'Gagal mengubah status keberatan' };
  }
}

export async function getPesan() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from('pesan').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pesan:', error);
    return [];
  }
}

export async function deletePesan(id: number) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('pesan').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting pesan:', error);
    return { success: false, error: error?.message || 'Gagal menghapus pesan' };
  }
}

export async function markPesanAsRead(id: number) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('pesan').update({ is_read: true }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating pesan:', error);
    return { success: false, error: error?.message || 'Gagal memperbarui status pesan' };
  }
}

export async function getPengguna() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const [profilesRes, usersRes] = await Promise.all([
      adminClient.from('user_profiles').select('*').order('created_at', { ascending: false }),
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (profilesRes.error) throw profilesRes.error;

    const authUsers = usersRes.data?.users || [];
    const authMap = new Map(authUsers.map(u => [u.id, u]));

    return (profilesRes.data || []).map((row: any) => {
      const authUser = authMap.get(row.id);
      return {
        id: row.id,
        nama: row.full_name || authUser?.user_metadata?.full_name || 'Tanpa Nama',
        full_name: row.full_name,
        email: authUser?.email || '-',
        role: row.role === 'admin' ? 'Admin PPID' : 'Pengguna Publik',
        raw_role: row.role,
        status: row.is_active ? 'Aktif' : 'Nonaktif',
        is_active: row.is_active,
        last_login: authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).toLocaleDateString('id-ID') : '-',
        phone_number: row.phone_number,
        address: row.address,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });
  } catch (error) {
    console.error('Error fetching pengguna:', error);
    return [];
  }
}

export async function createPengguna(data: any) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    const email = (data.email || '').trim().toLowerCase();
    const fullName = (data.nama || data.full_name || '').trim();
    const password = (data.password || '').trim();
    const rawRole = (data.role || '').toLowerCase();
    const targetRole: 'admin' | 'user' = rawRole.includes('admin') ? 'admin' : 'user';

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Alamat email wajib diisi dengan format valid.' };
    }
    if (!fullName) {
      return { success: false, error: 'Nama lengkap wajib diisi.' };
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password wajib diisi minimal 8 karakter.' };
    }

    // 1. Create auth user via Supabase Admin API
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return { success: false, error: createError.message || 'Gagal mendaftarkan akun di sistem autentikasi.' };
    }

    const newUserId = createData.user.id;

    // 2. Ensure profile has appropriate role & active status
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .upsert({
        id: newUserId,
        role: targetRole,
        is_active: data.status === 'Nonaktif' ? false : true,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error updating created user profile:', profileError);
      return { success: false, error: 'Akun terbuat namun gagal menyetel profil pengguna.' };
    }

    return { success: true, id: newUserId };
  } catch (error: any) {
    console.error('Error creating pengguna:', error);
    return { success: false, error: error?.message || 'Terjadi kesalahan sistem saat membuat pengguna.' };
  }
}

export async function updatePengguna(id: string, data: any) {
  try {
    const { user: currentAdmin } = await requireAdmin();
    const adminClient = createAdminClient();

    const fullName = data.nama || data.full_name;
    const rawRole = (data.role || '').toLowerCase();
    const targetRole: 'admin' | 'user' | undefined = data.role 
      ? (rawRole.includes('admin') ? 'admin' : 'user') 
      : undefined;
    const isActive: boolean | undefined = data.status !== undefined 
      ? (data.status === 'Aktif' || data.status === true) 
      : (data.is_active !== undefined ? Boolean(data.is_active) : undefined);

    // Guard against self-demotion or self-deactivation
    if (currentAdmin.id === id) {
      if (targetRole && targetRole !== 'admin') {
        return { success: false, error: 'Administrator tidak dapat mendemosi akunnya sendiri.' };
      }
      if (isActive === false) {
        return { success: false, error: 'Administrator tidak dapat menonaktifkan akunnya sendiri.' };
      }
    }

    // Guard against last active admin demotion/deactivation
    if (targetRole === 'user' || isActive === false) {
      const { count: otherAdminCount } = await adminClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', id);

      if (otherAdminCount === 0) {
        return { success: false, error: 'Tidak dapat mendemosi atau menonaktifkan administrator aktif terakhir.' };
      }
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (fullName !== undefined) updatePayload.full_name = fullName;
    if (targetRole !== undefined) updatePayload.role = targetRole;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const { error: profileError } = await adminClient
      .from('user_profiles')
      .update(updatePayload)
      .eq('id', id);

    if (profileError) throw profileError;

    // If email or metadata is provided, sync to auth.users
    const authUpdatePayload: any = {};
    if (data.email) authUpdatePayload.email = data.email.trim().toLowerCase();
    if (fullName) authUpdatePayload.user_metadata = { full_name: fullName };

    if (Object.keys(authUpdatePayload).length > 0) {
      await adminClient.auth.admin.updateUserById(id, authUpdatePayload);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating pengguna:', error);
    return { success: false, error: error?.message || 'Gagal memperbarui pengguna.' };
  }
}

export async function deletePengguna(id: string) {
  try {
    const { user: currentAdmin } = await requireAdmin();
    const adminClient = createAdminClient();

    if (currentAdmin.id === id) {
      return { success: false, error: 'Administrator tidak dapat menghapus akunnya sendiri.' };
    }

    // Check if the user is an active admin and the last active admin
    const { data: targetProfile } = await adminClient
      .from('user_profiles')
      .select('role, is_active')
      .eq('id', id)
      .single();

    if (targetProfile?.role === 'admin' && targetProfile?.is_active) {
      const { count: otherAdminCount } = await adminClient
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true)
        .neq('id', id);

      if (otherAdminCount === 0) {
        return { success: false, error: 'Tidak dapat menghapus administrator aktif terakhir.' };
      }
    }

    // Delete from auth.users (cascades to user_profiles)
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) {
      // Fallback: If auth delete fails, delete from user_profiles
      const { error: profileDeleteError } = await adminClient.from('user_profiles').delete().eq('id', id);
      if (profileDeleteError) throw profileDeleteError;
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting pengguna:', error);
    return { success: false, error: error?.message || 'Gagal menghapus pengguna.' };
  }
}

export async function getLogAktivitas() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('log_aktivitas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return (data || []).map((row: any) => {
      const meta = row.metadata || {};
      const actorName = meta.actor_name || meta.full_name || meta.actor_email;
      let displayUser = 'Sistem Otomatis';
      if (row.actor_role === 'admin') {
        displayUser = actorName ? `${actorName} (Admin)` : 'Administrator';
      } else if (row.actor_role === 'user') {
        displayUser = actorName || 'Pemohon Informasi';
      }

      return {
        id: row.id,
        actor_id: row.actor_id,
        actor_role: row.actor_role,
        user: displayUser,
        user_name: displayUser,
        waktu: row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '-',
        created_at: row.created_at,
        aksi: row.action || 'Aktivitas',
        action: row.action,
        detail: `${row.target_entity || ''} ${row.target_id ? `(#${row.target_id})` : ''}`.trim() || '-',
        target_entity: row.target_entity,
        target_id: row.target_id,
        metadata: meta,
        ip_address: row.ip_address || '-',
      };
    });
  } catch (error) {
    console.error('Error fetching log:', error);
    return [];
  }
}

export async function getProfil(sectionId: string) {
  try {
    const { data, error } = await supabase.from('profil_konten').select('content_json').eq('id', sectionId).single();
    if (!error && data && data.content_json) {
      if (Array.isArray(data.content_json) && data.content_json.length > 0) return data.content_json;
      if (typeof data.content_json === 'string' && data.content_json.trim()) return data.content_json;
      if (typeof data.content_json === 'object' && Object.keys(data.content_json).length > 0) return data.content_json;
    }
    // Fallback ke default
    switch (sectionId) {
      case 'sejarah': return defaultSejarah;
      case 'visi': return defaultVisi;
      case 'misi': return defaultMisi;
      case 'sejarah_kepala': return defaultSejarahKepala;
      case 'struktur_organisasi': return defaultStrukturOrganisasi;
      case 'struktur_kua': return defaultStrukturKUA;
      case 'struktur_madrasah': return defaultStrukturMadrasah;
      case 'maklumat': return defaultMaklumat;
      default: return [];
    }
  } catch (error) {
    console.error(`Error fetching profil ${sectionId}:`, error);
    switch (sectionId) {
      case 'sejarah': return defaultSejarah;
      case 'visi': return defaultVisi;
      case 'misi': return defaultMisi;
      case 'sejarah_kepala': return defaultSejarahKepala;
      case 'struktur_organisasi': return defaultStrukturOrganisasi;
      case 'struktur_kua': return defaultStrukturKUA;
      case 'struktur_madrasah': return defaultStrukturMadrasah;
      case 'maklumat': return defaultMaklumat;
      default: return [];
    }
  }
}

export async function updateProfil(sectionId: string, contentJson: any) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('profil_konten')
      .upsert({ id: sectionId, content_json: contentJson }, { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating profil ${sectionId}:`, error);
    return { success: false, error: error?.message || 'Gagal memperbarui profil' };
  }
}

export async function getDashboardStats() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    // 1. Fetch only 5 recent documents
    const { data: recentDocs, error: docsError } = await adminClient
      .from('informasi_publik')
      .select('id, judul, kategori, tanggal_update')
      .order('tanggal_update', { ascending: false })
      .limit(5);

    if (docsError) throw docsError;

    // 2. Count totals with proper adminClient & database schema enums
    const [
      docsCountRes,
      permohonanCountRes,
      permohonanPendingRes,
      keberatanPendingRes,
      penggunaCountRes,
      notifRes
    ] = await Promise.all([
      adminClient.from('informasi_publik').select('*', { count: 'exact', head: true }),
      adminClient.from('permohonan').select('*', { count: 'exact', head: true }),
      adminClient.from('permohonan').select('*', { count: 'exact', head: true }).eq('status_proses', 'diajukan'),
      adminClient.from('keberatan').select('*', { count: 'exact', head: true }).eq('status_keberatan', 'diajukan'),
      adminClient.from('user_profiles').select('*', { count: 'exact', head: true }),
      adminClient.from('notifikasi').select('*').eq('is_read', false).order('created_at', { ascending: false }).limit(5),
    ]);

    return {
      recentDocs: recentDocs || [],
      tasks: notifRes.data || [],
      stats: {
        totalDocs: docsCountRes.count || 0,
        permohonan: permohonanCountRes.count || 0,
        pengguna: penggunaCountRes.count || 0,
        permohonanPending: permohonanPendingRes.count || 0,
        keberatanPending: keberatanPendingRes.count || 0,
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      recentDocs: [],
      tasks: [],
      stats: { totalDocs: 0, permohonan: 0, pengguna: 0, permohonanPending: 0, keberatanPending: 0 }
    };
  }
}

export async function getKontenStatis(jenis: string) {
  try {
    const { data, error } = await supabase.from('konten_statis').select('*').eq('jenis', jenis).single();
    if (!error && data) return data;
    
    // Fallback jika belum tersimpan di tabel konten_statis
    if (jenis === 'profil-ppid') {
      const sejarah = await getProfil('sejarah');
      return { jenis: 'profil-ppid', judul: 'Profil PPID Kemenag Kota Parepare', isi: typeof sejarah === 'string' ? sejarah : defaultSejarah };
    }
    if (jenis === 'visi-misi') {
      const visi = await getProfil('visi');
      const misi = await getProfil('misi');
      const misiText = Array.isArray(misi) ? misi.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n') : defaultMisi.map((m, i) => `${i + 1}. ${m}`).join('\n');
      return { jenis: 'visi-misi', judul: typeof visi === 'string' ? visi : defaultVisi, isi: misiText };
    }
    if (jenis === 'maklumat-layanan') {
      const maklumat = await getProfil('maklumat');
      return { jenis: 'maklumat-layanan', judul: 'Maklumat Layanan', isi: typeof maklumat === 'string' ? maklumat : defaultMaklumat };
    }
    return null;
  } catch (error) {
    console.error('Error fetching konten statis:', error);
    return null;
  }
}

export async function updateKontenStatis(jenis: string, payload: any) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();

    let kontenStatisSuccess = false;
    let profilKontenSuccess = false;
    let lastError: any = null;

    // 1. Coba simpan ke tabel konten_statis
    try {
      const { error } = await adminClient
        .from('konten_statis')
        .upsert({ jenis, ...payload, updated_at: new Date().toISOString() }, { onConflict: 'jenis' });
      if (!error) {
        kontenStatisSuccess = true;
      } else {
        lastError = error;
      }
    } catch (err: any) {
      lastError = err;
    }

    // 2. Sinkronkan ke tabel profil_konten agar halaman publik langsung membaca perubahan
    try {
      if (jenis === 'profil-ppid' && payload.isi) {
        const res = await updateProfil('sejarah', payload.isi);
        if (res.success) profilKontenSuccess = true;
      } else if (jenis === 'visi-misi') {
        if (payload.judul) await updateProfil('visi', payload.judul);
        if (payload.isi) {
          // pisahkan baris jika berformat nomor/daftar
          const misiList = payload.isi
            .split('\n')
            .map((line: string) => line.replace(/^\d+[\.\)]\s*/, '').trim())
            .filter((line: string) => line.length > 0);
          const res = await updateProfil('misi', misiList);
          if (res.success) profilKontenSuccess = true;
        }
      } else if (jenis === 'maklumat-layanan' && payload.isi) {
        const res = await updateProfil('maklumat', payload.isi);
        if (res.success) profilKontenSuccess = true;
      }
    } catch (err) {
      console.error('Error syncing to profil_konten:', err);
    }

    // Jika salah satu atau keduanya berhasil, dianggap sukses
    if (kontenStatisSuccess || profilKontenSuccess) {
      return { success: true };
    }

    console.error('Error updating konten statis:', lastError);
    return { success: false, error: lastError?.message || 'Gagal memperbarui konten statis' };
  } catch (error: any) {
    console.error('Error in updateKontenStatis:', error);
    return { success: false, error: error?.message || 'Akses ditolak' };
  }
}

export async function getPengaturan() {
  try {
    const { data, error } = await supabase.from('pengaturan').select('*');
    if (error) throw error;
    // convert array to object
    const settings: Record<string, string> = {};
    if (data) {
      data.forEach(item => {
        settings[item.kunci] = item.nilai;
      });
    }
    return settings;
  } catch (error) {
    console.error('Error fetching pengaturan:', error);
    return {};
  }
}

export async function updatePengaturan(payload: Record<string, string>) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const entries = Object.keys(payload).map(kunci => ({
      kunci,
      nilai: payload[kunci]
    }));
    
    const { error } = await adminClient.from('pengaturan').upsert(entries, { onConflict: 'kunci' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating pengaturan:', error);
    return { success: false, error: error?.message || 'Gagal memperbarui pengaturan' };
  }
}

export async function getLaporanData(periode: string, tahun: string) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    // Legacy audit reference: from('permohonan').select('*')
    const { data, error } = await adminClient
      .from('permohonan')
      .select('id, nomor_permohonan, nama_pemohon, instansi, kebutuhan, status_proses, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.nomor_permohonan || row.id,
      nomor_permohonan: row.nomor_permohonan || row.id,
      nama: row.nama_pemohon || '-',
      nama_pemohon: row.nama_pemohon || '-',
      instansi: row.instansi || '-',
      tanggal: row.created_at ? row.created_at.split('T')[0] : '',
      created_at: row.created_at,
      status: row.status_proses || 'diajukan',
      status_proses: row.status_proses || 'diajukan',
      kebutuhan: row.kebutuhan || '-',
    }));
  } catch (error) {
    console.error('Error fetching laporan:', error);
    return [];
  }
}

// ==========================================
// PUBLIC API (FRONTEND FORMS)
// ==========================================

export async function submitPermohonan(payload: any) {
  try {
    const { createPermohonanAction } = await import('@/app/actions/permohonan');
    const result = await createPermohonanAction({
      nama_pemohon: payload.nama || payload.nama_pemohon,
      kebutuhan: payload.kebutuhan,
      kategori_pemohon: payload.kategori_pemohon,
      nik: payload.nik,
      instansi: payload.instansi,
      alamat: payload.alamat,
      telepon: payload.telepon,
      email: payload.email,
      tujuan_penggunaan: payload.tujuan_penggunaan,
      cara_memperoleh_informasi: payload.cara_memperoleh_informasi,
      cara_mendapatkan_salinan: payload.cara_mendapatkan_salinan,
      ktp_storage_path: payload.file_ktp_url || payload.ktp_storage_path,
    });

    if (result.success) {
      return {
        success: true,
        id: result.data.nomor_permohonan,
        tracking_token: result.data.tracking_token,
      };
    }

    return {
      success: false,
      error: result.error,
    };
  } catch (error: any) {
    console.error('Error submitting permohonan via RPC:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || 'Terjadi kesalahan sistem saat memproses permohonan.',
      },
    };
  }
}

export async function submitKeberatan(payload: any) {
  try {
    const { createKeberatan } = await import('@/lib/data/keberatan');
    const targetPermohonanId = payload.permohonanId || payload.permohonan_id || payload.id_permohonan;
    const alasan = payload.alasan || payload.alasan_keberatan || payload.alasanKeberatan;
    const kasusPosisi = payload.kasus_posisi || payload.kasusPosisi;
    const trackingToken = payload.trackingToken || payload.tracking_token || payload.token;

    if (!targetPermohonanId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ID permohonan referensi wajib disertakan.',
        },
      };
    }

    if (!alasan || alasan.trim().length < 5) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Alasan keberatan wajib diisi minimal 5 karakter.',
        },
      };
    }

    const res = await createKeberatan({
      permohonanId: targetPermohonanId,
      trackingToken: trackingToken?.trim(),
      alasanKeberatan: alasan.trim(),
      kasusPosisi: kasusPosisi?.trim(),
    });

    if (res.success && res.data) {
      return {
        success: true,
        id: res.data.nomor_keberatan || res.data.id,
        data: res.data,
      };
    }

    return {
      success: false,
      error: {
        code: 'ACTION_FAILED',
        message: res.error || 'Gagal mengajukan keberatan.',
      },
    };
  } catch (error: any) {
    console.error('Error submitting keberatan via service:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || 'Terjadi kesalahan sistem saat memproses pengajuan keberatan.',
      },
    };
  }
}

export async function submitPesan(payload: any) {
  try {
    const sender = String(payload?.sender || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const subject = String(payload?.subject || '').trim();
    const snippet = String(payload?.snippet || payload?.pesan || payload?.content || '').trim();

    if (!sender || sender.length < 2) {
      return { success: false, error: 'Nama pengirim wajib diisi minimal 2 karakter.' };
    }
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Alamat email tidak valid.' };
    }
    if (!subject || subject.length < 3) {
      return { success: false, error: 'Subjek pesan wajib diisi.' };
    }
    if (!snippet || snippet.length < 5) {
      return { success: false, error: 'Isi pesan wajib diisi minimal 5 karakter.' };
    }

    const { error } = await supabase.from('pesan').insert({
      sender,
      email,
      subject,
      snippet,
      content: snippet,
      date: new Date().toISOString().split('T')[0],
      is_read: false
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting pesan:', error);
    return { success: false, error: error?.message || 'Gagal mengirim pesan.' };
  }
}

export async function cekStatusTiket(
  id: string,
  emailOrToken?: string
): Promise<SafePublicTrackingResult> {
  try {
    const cleanId = (id || '').trim();
    const cleanAuth = (emailOrToken || '').trim();

    if (!cleanId) {
      return {
        success: false,
        error: 'Nomor tiket wajib diisi.',
      };
    }

    // Rate limiting to mitigate enumeration attacks
    let clientIp = 'anonymous';
    try {
      const { headers } = await import('next/headers');
      const headerList = await headers();
      clientIp = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || headerList.get('x-real-ip') || 'anonymous';
    } catch {
      // Fallback in testing or isolated runtime
    }

    const rateLimitKey = `${clientIp}:${cleanId}`;
    if (!checkTrackingRateLimit(rateLimitKey)) {
      return {
        success: false,
        error: 'Terlalu banyak permintaan tracking. Silakan coba kembali dalam 15 menit.',
      };
    }

    const adminClient = createAdminClient();

    // 1. Check permohonan first
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
    let permohonan: any = null;
    if (cleanId.includes('@')) {
      const { data: permohonanList } = await adminClient
        .from('permohonan')
        .select('id, nomor_permohonan, status_proses, decision, alasan_penolakan, nama_pemohon, kebutuhan, email, tracking_token_hash, created_at, updated_at, p_tiket_id')
        .ilike('email', cleanId)
        .order('created_at', { ascending: false });

      if (permohonanList && permohonanList.length > 0) {
        if (cleanAuth) {
          permohonan = permohonanList.find((p: any) =>
            p.tracking_token_hash && verifyTrackingToken(cleanAuth, p.tracking_token_hash)
          ) || null;
        } else {
          // If searching strictly by email without secret token, do not return records to prevent enumeration
          permohonan = null;
        }
      }
    } else {
      let permohonanQuery = adminClient
        .from('permohonan')
        .select('id, nomor_permohonan, status_proses, decision, alasan_penolakan, nama_pemohon, kebutuhan, email, tracking_token_hash, created_at, updated_at, p_tiket_id');

      if (isUuid) {
        permohonanQuery = permohonanQuery.or(`id.eq.${cleanId},nomor_permohonan.eq.${cleanId},p_tiket_id.eq.${cleanId}`);
      } else {
        permohonanQuery = permohonanQuery.or(`nomor_permohonan.eq.${cleanId},p_tiket_id.eq.${cleanId}`);
      }

      const { data } = await permohonanQuery.maybeSingle();
      permohonan = data;
    }

    if (permohonan) {
      const emailMatches = Boolean(cleanAuth && permohonan.email && permohonan.email.trim().toLowerCase() === cleanAuth.toLowerCase());
      const tokenMatches = Boolean(cleanAuth && permohonan.tracking_token_hash && verifyTrackingToken(cleanAuth, permohonan.tracking_token_hash));

      // If auth parameter was supplied, it must match either token or email
      if (cleanAuth && !emailMatches && !tokenMatches) {
        return {
          success: false,
          error: 'Nomor registrasi atau kode rahasia pelacakan tidak sesuai.',
        };
      }

      // Generate signed URLs for official response documents strictly when verified by tracking token
      let dokumenJawabanList: Array<{
        id: string;
        nama_dokumen: string;
        download_url: string;
        file_size_bytes?: number;
        created_at?: string;
      }> | undefined = undefined;

      const canAccessDocuments = tokenMatches || (Boolean(!permohonan.tracking_token_hash) && emailMatches && !cleanId.includes('@'));

      if (canAccessDocuments) {
        try {
          const { data: docs } = await adminClient
            .from('dokumen_permohonan')
            .select('id, original_filename, file_size_bytes, storage_path, created_at')
            .eq('permohonan_id', permohonan.id)
            .eq('kategori_dokumen', 'dokumen_jawaban')
            .order('created_at', { ascending: false });

          if (docs && docs.length > 0) {
            const signedDocs = await Promise.all(
              docs.map(async (doc: any) => {
                const { data: signed } = await adminClient.storage
                  .from('permohonan-dokumen')
                  .createSignedUrl(doc.storage_path, 300);

                return {
                  id: doc.id,
                  nama_dokumen: doc.original_filename || 'Dokumen_Jawaban_PPID.pdf',
                  download_url: signed?.signedUrl || '',
                  file_size_bytes: doc.file_size_bytes,
                  created_at: doc.created_at,
                };
              })
            );
            dokumenJawabanList = signedDocs.filter(d => Boolean(d.download_url));
          }
        } catch (docErr) {
          console.error('[CEK STATUS ERROR] Gagal membuat signed URL dokumen jawaban:', docErr);
        }
      }

      return {
        success: true,
        type: 'permohonan',
        data: {
          id: permohonan.id,
          nomor_permohonan: permohonan.nomor_permohonan || permohonan.p_tiket_id || permohonan.id,
          status_proses: permohonan.status_proses || 'diajukan',
          status: permohonan.status_proses || 'diajukan',
          decision: permohonan.decision || null,
          alasan_penolakan: permohonan.alasan_penolakan || null,
          tanggal_pengajuan: permohonan.created_at ? permohonan.created_at.split('T')[0] : '',
          tanggal: permohonan.created_at ? permohonan.created_at.split('T')[0] : '',
          nama_pemohon_masked: maskApplicantName(permohonan.nama_pemohon),
          kebutuhan: canAccessDocuments ? permohonan.kebutuhan : undefined,
          tanggapan: null,
          dokumen_jawaban: dokumenJawabanList,
        },
      };
    }

    // 2. Check keberatan
    let keberatanQuery = adminClient
      .from('keberatan')
      .select(`
        id,
        nomor_keberatan,
        alasan_keberatan,
        status_keberatan,
        tanggapan_atasan,
        created_at,
        updated_at,
        permohonan:permohonan_id (
          id,
          nomor_permohonan,
          nama_pemohon,
          email,
          tracking_token_hash
        )
      `);

    if (isUuid) {
      keberatanQuery = keberatanQuery.or(`id.eq.${cleanId},nomor_keberatan.eq.${cleanId}`);
    } else {
      keberatanQuery = keberatanQuery.eq('nomor_keberatan', cleanId);
    }

    const { data: keberatan } = await keberatanQuery.maybeSingle();

    if (keberatan) {
      const perm: any = (keberatan as any).permohonan || {};
      if (cleanAuth) {
        const emailMatches = perm.email && perm.email.trim().toLowerCase() === cleanAuth.toLowerCase();
        const tokenMatches = perm.tracking_token_hash && verifyTrackingToken(cleanAuth, perm.tracking_token_hash);

        if (!emailMatches && !tokenMatches) {
          return {
            success: false,
            error: 'Nomor registrasi atau kode rahasia pelacakan tidak sesuai.',
          };
        }
      }

      return {
        success: true,
        type: 'keberatan',
        data: {
          id: keberatan.id,
          nomor_permohonan: keberatan.nomor_keberatan || perm.nomor_permohonan || keberatan.id,
          status_proses: keberatan.status_keberatan || 'diajukan',
          status: keberatan.status_keberatan || 'diajukan',
          tanggal_pengajuan: keberatan.created_at ? keberatan.created_at.split('T')[0] : '',
          tanggal: keberatan.created_at ? keberatan.created_at.split('T')[0] : '',
          nama_pemohon_masked: maskApplicantName(perm.nama_pemohon),
          kebutuhan: cleanAuth ? keberatan.alasan_keberatan : undefined,
          tanggapan: cleanAuth ? (keberatan.tanggapan_atasan || null) : null,
        },
      };
    }

    return { success: false, error: 'Tiket tidak ditemukan.' };
  } catch (error) {
    console.error('[SERVER ACTION ERROR] cekStatusTiket failed:', error);
    return { success: false, error: 'Terjadi kesalahan sistem saat memeriksa status tiket.' };
  }
}

export async function submitPartisipasiPublik(payload: any) {
  try {
    const nama = typeof payload?.nama === 'string' ? payload.nama.trim().slice(0, 150) : '';
    const email = typeof payload?.email === 'string' ? payload.email.trim().slice(0, 150) : '';
    const telepon = typeof payload?.telepon === 'string' ? payload.telepon.trim().slice(0, 50) : '';
    const jenis = ['saran', 'kritik', 'pendapat'].includes(payload?.jenis) ? payload.jenis : 'saran';
    const judul = typeof payload?.judul === 'string' ? payload.judul.trim().slice(0, 255) : '';
    const pesan = typeof payload?.pesan === 'string' ? payload.pesan.trim().slice(0, 3000) : '';

    if (!nama || nama.length < 2) {
      return { success: false, error: 'Nama pengirim wajib diisi minimal 2 karakter.' };
    }
    if (!judul || judul.length < 3) {
      return { success: false, error: 'Judul aspirasi wajib diisi minimal 3 karakter.' };
    }
    if (!pesan || pesan.length < 5) {
      return { success: false, error: 'Pesan aspirasi wajib diisi minimal 5 karakter.' };
    }

    const { error } = await supabase.from('partisipasi_publik').insert({
      nama,
      email: email || null,
      telepon: telepon || null,
      jenis,
      judul,
      pesan,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'menunggu',
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting partisipasi publik:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function submitSurveiKepuasan(payload: any) {
  try {
    const nama = typeof payload?.nama === 'string' ? payload.nama.trim().slice(0, 150) : '';
    const email = typeof payload?.email === 'string' ? payload.email.trim().slice(0, 150) : '';
    const telepon = typeof payload?.telepon === 'string' ? payload.telepon.trim().slice(0, 50) : '';
    const pekerjaan = typeof payload?.pekerjaan === 'string' ? payload.pekerjaan.trim().slice(0, 100) : 'Masyarakat Umum';
    const saran = typeof payload?.saran === 'string' ? payload.saran.trim().slice(0, 2000) : null;

    const clampScore = (score: any) => {
      const parsed = parseInt(score, 10);
      return isNaN(parsed) ? 4 : Math.min(Math.max(parsed, 1), 4);
    };

    const { error } = await supabase.from('survei_kepuasan').insert({
      nama: nama || null,
      email: email || null,
      telepon: telepon || null,
      pekerjaan,
      saran,
      skor_persyaratan: clampScore(payload?.skor_persyaratan),
      skor_prosedur: clampScore(payload?.skor_prosedur),
      skor_waktu: clampScore(payload?.skor_waktu),
      skor_biaya: clampScore(payload?.skor_biaya),
      skor_produk: clampScore(payload?.skor_produk),
      skor_kompetensi: clampScore(payload?.skor_kompetensi),
      skor_perilaku: clampScore(payload?.skor_perilaku),
      skor_sarana: clampScore(payload?.skor_sarana),
      skor_penanganan: clampScore(payload?.skor_penanganan),
      tanggal: new Date().toISOString().split('T')[0],
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting survei kepuasan:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export interface PublicStatistikDTO {
  total: number;
  approved: number;
  processing: number;
  rejected: number;
  monthly: Array<{ month: string; value: number }>;
}

export async function getPublicStatistik(): Promise<PublicStatistikDTO> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyCounts = new Array(12).fill(0);

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('permohonan')
      .select('status_proses, decision, created_at');

    if (error || !data) {
      return {
        total: 0,
        approved: 0,
        processing: 0,
        rejected: 0,
        monthly: months.map((m) => ({ month: m, value: 0 })),
      };
    }

    const total = data.length;
    let approved = 0;
    let processing = 0;
    let rejected = 0;

    data.forEach((row: any) => {
      const status = (row.status_proses || '').toLowerCase();
      const decision = (row.decision || '').toLowerCase();

      if (decision === 'dikabulkan_sepenuhnya' || decision === 'dikabulkan_sebagian' || status === 'disetujui') {
        approved++;
      } else if (decision === 'ditolak' || status === 'ditolak') {
        rejected++;
      } else if (['pending', 'diajukan', 'diproses'].includes(status)) {
        processing++;
      } else if (status === 'selesai') {
        approved++;
      }

      if (row.created_at) {
        const m = new Date(row.created_at).getMonth();
        if (m >= 0 && m < 12) {
          monthlyCounts[m]++;
        }
      }
    });

    return {
      total,
      approved,
      processing,
      rejected,
      monthly: months.map((m, i) => ({ month: m, value: monthlyCounts[i] })),
    };
  } catch (err) {
    console.error('Error fetching public statistik:', err);
    return {
      total: 0,
      approved: 0,
      processing: 0,
      rejected: 0,
      monthly: months.map((m) => ({ month: m, value: 0 })),
    };
  }
}

// ==========================================
// ADMIN ACTIONS: PARTISIPASI PUBLIK & SURVEI
// ==========================================

export async function getPartisipasiPublik() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from('partisipasi_publik').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching partisipasi publik:', error);
    return [];
  }
}

export async function updatePartisipasiStatus(id: number, status: string, tanggapan?: string) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const updateData: any = { status };
    if (tanggapan !== undefined) {
      updateData.tanggapan = tanggapan;
    }
    const { error } = await adminClient.from('partisipasi_publik').update(updateData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating partisipasi status:', error);
    return { success: false, error: error?.message || 'Gagal mengubah status partisipasi publik' };
  }
}

export async function deletePartisipasiPublik(id: number) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('partisipasi_publik').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting partisipasi publik:', error);
    return { success: false, error: error?.message || 'Gagal menghapus data partisipasi publik' };
  }
}

export async function getSurveiKepuasan() {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from('survei_kepuasan').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching survei kepuasan:', error);
    return [];
  }
}

export async function deleteSurveiKepuasan(id: number) {
  try {
    await requireAdmin();
    const adminClient = createAdminClient();
    const { error } = await adminClient.from('survei_kepuasan').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting survei kepuasan:', error);
    return { success: false, error: error?.message || 'Gagal menghapus data survei kepuasan' };
  }
}



