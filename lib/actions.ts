'use server';

import { supabase } from './supabase';
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

    let { data: result, error } = await supabase.from('berita').insert([payload]).select();
    
    // Jika error karena kolom status belum ada di tabel berita, coba insert tanpa kolom status
    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await supabase.from('berita').insert([payload]).select();
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

    let { data: result, error } = await supabase.from('berita').update(payload).eq('id', id).select();
    
    // Fallback jika kolom status belum ada di DB
    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await supabase.from('berita').update(payload).eq('id', id).select();
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
    const { error } = await supabase.from('berita').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting berita:', error);
    return { success: false, error };
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

    let { data: result, error } = await supabase.from('informasi_publik').insert([payload]).select();

    // Fallback jika kolom status belum ada di DB
    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await supabase.from('informasi_publik').insert([payload]).select();
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
    const payload: any = { ...data };
    if (payload.kategori) {
      payload.kategori = normalizeKategori(payload.kategori);
    }
    if (payload.tanggal_update && payload.tanggal_update.includes('T')) {
      payload.tanggal_update = payload.tanggal_update.split('T')[0];
    }

    let { data: result, error } = await supabase.from('informasi_publik').update(payload).eq('id', id).select();

    if (error && error.message && error.message.includes('status')) {
      delete payload.status;
      const retry = await supabase.from('informasi_publik').update(payload).eq('id', id).select();
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
    const { error } = await supabase.from('informasi_publik').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting informasi publik:', error);
    return { success: false, error };
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
    const { error } = await supabase.from('faqs').insert([data]);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding faq:', error);
    return { success: false, error };
  }
}

export async function updateFaq(id: number, data: { question: string, answer: string }) {
  try {
    const { error } = await supabase.from('faqs').update(data).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating faq:', error);
    return { success: false, error };
  }
}

export async function deleteFaq(id: number) {
  try {
    const { error } = await supabase.from('faqs').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting faq:', error);
    return { success: false, error };
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
    const { data, error } = await supabase.from('permohonan').select('*').order('tanggal', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching permohonan:', error);
    return [];
  }
}

export async function updatePermohonanStatus(id: string, status: string) {
  try {
    const { error } = await supabase.from('permohonan').update({ status }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating permohonan status:', error);
    return { success: false, error };
  }
}

export async function updatePermohonanInternalNotes(id: string, notes: string) {
  try {
    const { error } = await supabase.from('permohonan').update({ catatan_internal: notes }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating permohonan internal notes:', error);
    return { success: false, error };
  }
}

export async function getKeberatan() {
  try {
    const { data, error } = await supabase.from('keberatan').select('*').order('tanggal', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching keberatan:', error);
    return [];
  }
}

export async function updateKeberatanStatus(id: string, status: string, tanggapan?: string) {
  try {
    const updateData: any = { status };
    if (tanggapan !== undefined) {
      updateData.tanggapan = tanggapan;
    }
    const { error } = await supabase.from('keberatan').update(updateData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating keberatan status:', error);
    return { success: false, error };
  }
}

export async function getPesan() {
  try {
    const { data, error } = await supabase.from('pesan').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pesan:', error);
    return [];
  }
}

export async function deletePesan(id: number) {
  try {
    const { error } = await supabase.from('pesan').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting pesan:', error);
    return { success: false, error };
  }
}

export async function markPesanAsRead(id: number) {
  try {
    const { error } = await supabase.from('pesan').update({ is_read: true }).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating pesan:', error);
    return { success: false, error };
  }
}

export async function getPengguna() {
  try {
    const { data, error } = await supabase.from('pengguna').select('*').order('nama', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pengguna:', error);
    return [];
  }
}

export async function createPengguna(data: any) {
  try {
    const { error } = await supabase.from('pengguna').insert([data]);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error creating pengguna:', error);
    return { success: false, error };
  }
}

export async function updatePengguna(id: string, data: any) {
  try {
    const { error } = await supabase.from('pengguna').update(data).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating pengguna:', error);
    return { success: false, error };
  }
}

export async function deletePengguna(id: string) {
  try {
    const { error } = await supabase.from('pengguna').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting pengguna:', error);
    return { success: false, error };
  }
}

export async function getLogAktivitas() {
  try {
    const { data, error } = await supabase.from('log_aktivitas').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
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
    const { error } = await supabase
      .from('profil_konten')
      .upsert({ id: sectionId, content_json: contentJson }, { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error(`Error updating profil ${sectionId}:`, error);
    return { success: false, error: error?.message || error };
  }
}

export async function getDashboardStats() {
  try {
    // 1. Fetch only 5 recent documents
      const { data: recentDocs, error: docsError } = await supabase
        .from('informasi_publik')
        .select('id, judul, kategori, tanggal_update')
        .order('tanggal_update', { ascending: false })
        .limit(5);
      
    if (docsError) throw docsError;

    // 2. Count totals
    const { count: totalDocs } = await supabase.from('informasi_publik').select('*', { count: 'exact', head: true });
    const { count: totalPermohonan } = await supabase.from('permohonan').select('*', { count: 'exact', head: true });
    const { count: totalPengguna } = await supabase.from('pengguna').select('*', { count: 'exact', head: true });
    const { count: permohonanPending } = await supabase.from('permohonan').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: keberatanPending } = await supabase.from('keberatan').select('*', { count: 'exact', head: true }).eq('status', 'menunggu');

    // 3. Fetch Unread Notifications for "Tugas Menunggu"
    const { data: recentNotif, error: notifError } = await supabase
      .from('notifikasi')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      recentDocs: recentDocs || [],
      tasks: recentNotif || [],
      stats: {
        totalDocs: totalDocs || 0,
        permohonan: totalPermohonan || 0,
        pengguna: totalPengguna || 0,
        permohonanPending: permohonanPending || 0,
        keberatanPending: keberatanPending || 0,
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
  let kontenStatisSuccess = false;
  let profilKontenSuccess = false;
  let lastError: any = null;

  // 1. Coba simpan ke tabel konten_statis
  try {
    const { error } = await supabase
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
  return { success: false, error: lastError?.message || lastError };
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
    const entries = Object.keys(payload).map(kunci => ({
      kunci,
      nilai: payload[kunci]
    }));
    
    const { error } = await supabase.from('pengaturan').upsert(entries, { onConflict: 'kunci' });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating pengaturan:', error);
    return { success: false, error };
  }
}

export async function getLaporanData(periode: string, tahun: string) {
  try {
    const { data, error } = await supabase.from('permohonan').select('*');
    if (error) throw error;
    return data || [];
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
    const id = `REQ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const { error } = await supabase.from('permohonan').insert({
      id,
      ...payload,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
    if (error) throw error;
    return { success: true, id };
  } catch (error) {
    console.error('Error submitting permohonan:', error);
    return { success: false, error };
  }
}

export async function submitKeberatan(payload: any) {
  try {
    const id = `OBJ-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    const { error } = await supabase.from('keberatan').insert({
      id,
      ...payload,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'menunggu'
    });
    if (error) throw error;
    return { success: true, id };
  } catch (error) {
    console.error('Error submitting keberatan:', error);
    return { success: false, error };
  }
}

export async function submitPesan(payload: any) {
  try {
    const { error } = await supabase.from('pesan').insert({
      ...payload,
      date: new Date().toISOString().split('T')[0],
      is_read: false
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error submitting pesan:', error);
    return { success: false, error };
  }
}

export async function cekStatusTiket(id: string) {
  try {
    // Check permohonan first
    let { data, error } = await supabase.from('permohonan').select('*').eq('id', id).single();
    if (data) return { success: true, type: 'permohonan', data };
    
    // Check keberatan
    ({ data, error } = await supabase.from('keberatan').select('*').eq('id', id).single());
    if (data) return { success: true, type: 'keberatan', data };
    
    return { success: false, error: 'Tiket tidak ditemukan' };
  } catch (error) {
    return { success: false, error };
  }
}

export async function submitPartisipasiPublik(payload: any) {
  try {
    const { error } = await supabase.from('partisipasi_publik').insert({
      ...payload,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'menunggu'
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
    const { error } = await supabase.from('survei_kepuasan').insert({
      ...payload,
      tanggal: new Date().toISOString().split('T')[0]
    });
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error submitting survei kepuasan:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

// ==========================================
// ADMIN ACTIONS: PARTISIPASI PUBLIK & SURVEI
// ==========================================

export async function getPartisipasiPublik() {
  try {
    const { data, error } = await supabase.from('partisipasi_publik').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching partisipasi publik:', error);
    return [];
  }
}

export async function updatePartisipasiStatus(id: number, status: string, tanggapan?: string) {
  try {
    const updateData: any = { status };
    if (tanggapan !== undefined) {
      updateData.tanggapan = tanggapan;
    }
    const { error } = await supabase.from('partisipasi_publik').update(updateData).eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating partisipasi status:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function deletePartisipasiPublik(id: number) {
  try {
    const { error } = await supabase.from('partisipasi_publik').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting partisipasi publik:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function getSurveiKepuasan() {
  try {
    const { data, error } = await supabase.from('survei_kepuasan').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching survei kepuasan:', error);
    return [];
  }
}

export async function deleteSurveiKepuasan(id: number) {
  try {
    const { error } = await supabase.from('survei_kepuasan').delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting survei kepuasan:', error);
    return { success: false, error: error?.message || String(error) };
  }
}



