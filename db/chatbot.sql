-- supabase/chatbot.sql
-- Jalankan di Supabase Dashboard > SQL Editor.
-- Aman dijalankan ulang untuk tabel & kebijakan; bagian seed hanya berjalan jika tabel masih kosong.

-- 1) Basis pengetahuan chatbot (terpisah dari tabel "faqs" agar halaman /faq di website tidak ikut berubah)
create table if not exists public.chatbot_kb (
  id bigint generated always as identity primary key,
  kategori text not null default 'Umum',
  pertanyaan_variasi text[] not null,
  jawaban_variasi text[] not null,
  aktif boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

-- 2) Log pertanyaan yang tidak terjawab (untuk bahan menambah FAQ)
create table if not exists public.chatbot_log (
  id bigint generated always as identity primary key,
  pesan text not null check (char_length(pesan) <= 300),
  status text not null,
  skor numeric,
  dibuat_pada timestamptz not null default now()
);

-- 3) Keamanan (RLS)
alter table public.chatbot_kb enable row level security;
alter table public.chatbot_log enable row level security;

drop policy if exists "chatbot_kb dapat dibaca publik" on public.chatbot_kb;
create policy "chatbot_kb dapat dibaca publik" on public.chatbot_kb
  for select using (aktif = true);

drop policy if exists "chatbot_log boleh ditambah" on public.chatbot_log;
create policy "chatbot_log boleh ditambah" on public.chatbot_log
  for insert with check (char_length(pesan) <= 300);
-- Sengaja TIDAK ada policy select untuk chatbot_log: isi log hanya bisa dibaca dari Dashboard Supabase.

-- 4) Data awal dari faq.json (hanya jika tabel masih kosong)
do $$
begin
  if not exists (select 1 from public.chatbot_kb) then
    insert into public.chatbot_kb (kategori, pertanyaan_variasi, jawaban_variasi) values
    ('Prosedur PPID',
    ARRAY['apa syarat permohonan informasi publik',
    'bagaimana syarat minta data di ppid kemenag',
    'dokumen apa yang dibutuhkan untuk ajukan informasi publik',
    'persyaratan permohonan informasi',
    'bagaimana cara meminta data informasi di kemenag parepare',
    'syarat minta data dokumen ppid'],
    ARRAY['Persyaratan permohonan informasi publik di PPID Kemenag:
• Melampirkan identitas diri yang sah (fotokopi/scan KTP pemohon, atau akta pendirian/surat kuasa bagi lembaga/LSM)
• Mengisi Formulir Permohonan Informasi Publik (tersedia di meja layanan atau portal daring)
• Mencantumkan rincian informasi publik yang dibutuhkan secara spesifik
• Mencantumkan tujuan penggunaan informasi secara jelas dan dapat dipertanggungjawabkan',
    'Dokumen syarat permohonan data PPID:
1. Salinan KTP pemohon yang masih berlaku
2. Formulir resmi permohonan informasi publik yang sudah diisi lengkap
3. Surat kuasa resmi jika permohonan mewakili organisasi/badan hukum
4. Keterangan tujuan peruntukan data secara tertulis']),
    ('Waktu & Biaya PPID',
    ARRAY['berapa lama jangka waktu permohonan informasi diproses',
    'kapan permohonan informasi saya dijawab',
    'waktu pelayanan informasi ppid',
    'berapa hari ppid memproses data pemohon',
    'jangka waktu tanggapan informasi'],
    ARRAY['Standar waktu pelayanan informasi sesuai UU KIP No. 14 Tahun 2008:
1. Tanggapan tertulis diberikan paling lambat 10 (sepuluh) hari kerja sejak permohonan dinyatakan lengkap.
2. Waktu proses dapat diperpanjang maksimal 7 (tujuh) hari kerja berikutnya dengan pemberitahuan tertulis jika memerlukan penelusuran dokumen mendalam.',
    'Ketentuan durasi proses permohonan informasi publik:
• Jawaban/keputusan awal: maksimal 10 hari kerja.
• Tambahan perpanjangan resmi: maksimal 7 hari kerja (disertai surat alasan resmi dari Atasan PPID).']),
    ('Waktu & Biaya PPID',
    ARRAY['berapa biaya layanan permohonan informasi',
    'apakah minta data ppid berbayar',
    'tarif layanan informasi publik kemenag',
    'berapa biaya fotokopi berkas informasi',
    'ongkos pengurusan data ppid'],
    ARRAY['Ketentuan biaya pelayanan PPID Kementerian Agama:
• Pelayanan dan permohonan informasi publik adalah Rp0 (Gratis).
• Pengiriman dokumen dalam format digital/softcopy via email tidak dipungut biaya apa pun.
• Biaya penggandaan berkas fisik (fotokopi) atau penyediaan flashdisk ditanggung sendiri oleh pemohon.',
    'Layanan informasi di PPID Kemenag Parepare bebas biaya (gratis). Pemohon hanya bertanggung jawab mandiri atas biaya penggandaan fisik jika membutuhkan salinan berkas cetak.']),
    ('Keberatan & Sengketa PPID',
    ARRAY['bagaimana cara mengajukan keberatan informasi',
    'prosedur pengajuan keberatan ppid',
    'saya tidak puas dengan jawaban ppid kemenag',
    'alur sengketa informasi publik di kemenag',
    'cara sengketa informasi ke komisi informasi'],
    ARRAY['Tahapan pengajuan keberatan layanan informasi:
1. Pemohon mengajukan Surat Keberatan tertulis kepada Atasan PPID maksimal 30 hari kerja setelah tanggapan diterima atau batas waktu terlampaui.
2. Atasan PPID wajib memberikan tanggapan resmi maksimal 30 hari kerja sejak keberatan diterima.
3. Jika pemohon belum puas atas tanggapan Atasan PPID, pemohon dapat mengajukan Sengketa Informasi ke Komisi Informasi dalam jangka waktu 14 hari kerja.']),
    ('Klasifikasi Informasi',
    ARRAY['apa saja informasi yang dikecualikan di kemenag',
    'informasi apa yang tidak boleh diminta di ppid',
    'apakah semua data kementerian agama boleh diminta masyarakat',
    'data rahasia kemenag'],
    ARRAY['Klasifikasi Informasi yang Dikecualikan (tidak dapat diakses publik):
• Berkas yang berkaitan langsung dengan proses penegakan hukum yang sedang berjalan
• Data pribadi/privasi pegawai (seperti rekam medis, nomor rekening pribadi, dokumen keluarga)
• Rahasia jabatan dan rahasia negara sesuai undang-undang
• Dokumen yang masih berupa draf kerja atau belum diputuskan secara final']),
    ('Layanan KUA & Pernikahan',
    ARRAY['bagaimana persyaratan menikah',
    'apa saja syarat nikah di kua',
    'dokumen apa yang harus disiapkan untuk daftar nikah',
    'cara pendaftaran nikah di kemenag parepare',
    'syarat berkas kawin',
    'berkas daftar nikah'],
    ARRAY['Persyaratan pendaftaran nikah di Kantor KUA:
1. Surat pengantar nikah dari kelurahan setempat (Formulir N1 - N4)
2. Fotokopi KTP, Kartu Keluarga (KK), dan Akta Kelahiran calon pengantin serta orang tua
3. Pas foto berlatar biru ukuran 2x3 (4 lembar) dan 4x6 (2 lembar)
4. Surat rekomendasi nikah dari KUA asal (jika akad nikah di luar kecamatan domisili)
5. Surat persetujuan calon mempelai dan izin komandan bagi anggota TNI/Polri

Catatan: Berkas diserahkan minimal 10 hari kerja sebelum jadwal akad nikah.']),
    ('Layanan KUA & Pernikahan',
    ARRAY['berapa biaya nikah di kua',
    'apakah menikah di kua bayar',
    'tarif nikah di luar kantor kua',
    'biaya nikah resmi kemenag',
    'ongkos penghulu nikah',
    'budget nikah'],
    ARRAY['Ketentuan tarif nikah resmi (PP No. 48/2014 & PP No. 59/2018):
• Akad nikah di Kantor KUA pada hari dan jam dinas: Rp0 (Gratis)
• Akad nikah di luar Kantor KUA atau di luar jam kerja: Rp600.000

Pembayaran biaya nikah di luar kantor disetor langsung ke kas negara melalui bank persepsi (bukan tunai ke penghulu/petugas).']),
    ('Layanan KUA & Pernikahan',
    ARRAY['bagaimana syarat numpang nikah',
    'surat rekomendasi nikah luar daerah',
    'cara minta surat rekomendasi nikah di kua',
    'syarat numpang nikah di kota parepare'],
    ARRAY['Syarat rekomendasi/numpang nikah ke kecamatan/kota lain:
1. Surat pengantar nikah dari kelurahan domisili asal
2. Fotokopi KTP, Kartu Keluarga, dan Akta Kelahiran pemohon
3. Surat pengantar dari KUA kecamatan asal yang ditujukan ke KUA kecamatan tujuan
4. Membawa fotokopi KTP calon pasangan']),
    ('Layanan KUA & Pernikahan',
    ARRAY['bagaimana cara mengurus buku nikah yang hilang atau rusak',
    'syarat duplikat buku nikah',
    'buku nikah hilang',
    'ganti buku nikah rusak'],
    ARRAY['Persyaratan penerbitan Duplikat Buku Nikah di KUA tempat menikah:
• Buku Nikah Hilang: Surat Keterangan Kehilangan dari Kepolisian (Polsek setempat), fotokopi KTP/KK, dan pas foto 2x3 latar biru.
• Buku Nikah Rusak: Membawa fisik Buku Nikah yang rusak, fotokopi KTP/KK, dan pas foto 2x3 latar biru.
Penerbitan duplikat buku nikah tidak dipungut biaya (Gratis).']),
    ('Layanan KUA & Kemasjidan',
    ARRAY['bagaimana cara mengajukan pengukuran arah kiblat',
    'syarat kalibrasi arah kiblat masjid',
    'cara minta ukur arah kiblat mushalla di parepare',
    'pengukuran arah kiblat kemenag'],
    ARRAY['Prosedur permohonan pengukuran arah kiblat di Kemenag Parepare:
1. Pengurus masjid/mushalla atau perorangan membuat Surat Permohonan resmi yang ditujukan kepada Kepala Kantor Kemenag Kota Parepare (c.q. Seksi Bimas Islam).
2. Cantumkan nama masjid/mushalla, alamat lengkap/titik lokasi, dan nomor kontak pengurus.
3. Tim Hisab Rukyat Kemenag akan turun langsung ke lokasi untuk melakukan pengukuran dan menerbitkan Sertifikat Arah Kiblat resmi (Gratis).']),
    ('Layanan Haji & Umrah',
    ARRAY['bagaimana cara daftar haji reguler',
    'apa syarat pendaftaran haji di kemenag',
    'alur pendaftaran porsi haji kemenag parepare',
    'syarat buka porsi haji',
    'dokumen daftar haji'],
    ARRAY['Tahapan pendaftaran porsi haji reguler:
1. Buka rekening tabungan haji pada Bank Penerima Setoran (BPS-BPIH) dan setorkan setoran awal sebesar Rp25.000.000 untuk mendapatkan bukti validasi bank.
2. Bawa berkas ke Seksi Penyelenggaraan Haji dan Umrah (PHU) Kantor Kemenag Parepare:
   • Salinan KTP, Kartu Keluarga, Akta Kelahiran/Buku Nikah/Ijazah
   • Surat Keterangan Domisili (jika alamat KTP berbeda)
   • Pas foto haji terbaru
3. Petugas melakukan verifikasi, foto biometrik, dan perekaman sidik jari untuk mencetak lembar SPPH yang memuat Nomor Porsi resmi.']),
    ('Layanan Haji & Umrah',
    ARRAY['bagaimana syarat pelimpahan nomor porsi haji',
    'pelimpahan porsi haji karena meninggal',
    'syarat ganti nomor porsi haji yang sakit permanen',
    'waris porsi haji'],
    ARRAY['Syarat pelimpahan nomor porsi haji (karena wafat atau sakit permanen):
• Surat permohonan pelimpahan porsi bermaterai dari calon penerima pelimpahan
• Akta Kematian dari Disdukcapil (jika wafat) atau Surat Keterangan Sakit Permanen dari Rumah Sakit Pemerintah
• Surat Kuasa Penunjukan bermaterai yang ditandatangani oleh seluruh ahli waris sah
• Salinan KTP, KK, Akta Lahir/Buku Nikah penerima pelimpahan (harus suami/istri/anak kandung/saudara kandung)
• Bukti Asli Setoran Awal BPIH dan lembar SPPH asli almarhum']),
    ('Layanan Haji & Umrah',
    ARRAY['bagaimana syarat rekomendasi paspor umrah dan haji',
    'minta surat rekomendasi paspor umroh',
    'syarat rekomendasi paspor kemenag'],
    ARRAY['Syarat permohonan surat rekomendasi paspor haji/umrah di Seksi PHU:
1. Surat permohonan dan surat rekomendasi resmi dari Travel/PPIU (Penyelenggara Perjalanan Ibadah Umrah) yang berizin resmi Kemenag
2. Salinan izin operasional PPIU/travel yang masih berlaku
3. Fotokopi KTP dan Kartu Keluarga calon jamaah
4. Surat pernyataan calon jamaah bermaterai']),
    ('Pendidikan Madrasah',
    ARRAY['bagaimana syarat legalisir ijazah madrasah',
    'cara legalisir ijazah ra mi mts ma di kemenag',
    'syarat pengesahan ijazah madrasah kemenag parepare',
    'legalisir ijazah pesantren'],
    ARRAY['Persyaratan legalisir ijazah madrasah (RA/MI/MTs/MA) di Seksi Pendidikan Madrasah:
1. Membawa Ijazah Asli dan Transkrip Nilai Asli
2. Membawa fotokopi ijazah yang akan dilegalisir (maksimal 5-10 lembar)
3. Fotokopi KTP pemilik ijazah
Catatan: Jika madrasah asal masih beroperasi, legalisir dilakukan langsung di madrasah bersangkutan. Legalisir di Kantor Kemenag dilakukan jika madrasah asal sudah tutup/merger atau bagi ijazah pondok pesantren salafiyah.']),
    ('Pendidikan Madrasah',
    ARRAY['bagaimana mengurus ijazah madrasah yang hilang atau rusak',
    'syarat surat keterangan pengganti ijazah skpi kemenag',
    'ijazah mi mts ma hilang'],
    ARRAY['Persyaratan penerbitan Surat Keterangan Pengganti Ijazah (SKPI) di Kemenag:
1. Surat Keterangan Kehilangan Ijazah dari Kepolisian (Polsek/Polres)
2. Surat Pernyataan Tanggung Jawab Mutlak (SPTJM) bermaterai
3. Fotokopi ijazah yang hilang (jika ada) atau buku induk madrasah
4. Surat keterangan dari Kepala Madrasah yang bersangkutan
5. Fotokopi KTP dan Akta Kelahiran pemohon']),
    ('Jaminan Produk Halal',
    ARRAY['bagaimana cara daftar sertifikasi halal gratis',
    'syarat sertifikat halal gratis sehati sehati umkm',
    'cara mengajukan sertifikasi halal di kemenag parepare',
    'pendaftaran produk halal self declare'],
    ARRAY['Persyaratan Sertifikasi Halal Gratis (Program Sehati / Self-Declare BPJPH):
1. Pelaku Usaha Mikro dan Kecil (UMK) dengan produk olahan sederhana dan tidak berisiko tinggi
2. Memiliki Nomor Induk Berusaha (NIB) berbasis risiko
3. Menggunakan bahan-bahan yang sudah dipastikan kehalalannya (bersertifikat halal atau bahan alami)
4. Memiliki proses produksi yang bersih dan terpisah dari kontaminasi non-halal
5. Pendaftaran dilakukan secara mandiri melalui portal ptsp.halal.go.id atau didampingi Pendamping Proses Produk Halal (PPH) di Kantor Kemenag.']),
    ('Rumah Ibadah',
    ARRAY['bagaimana syarat rekomendasi pendirian rumah ibadah',
    'surat rekomendasi pembangunan gereja masjid pura vihara',
    'izin mendirikan rumah ibadah kemenag parepare'],
    ARRAY['Syarat rekomendasi pendirian rumah ibadah (PBM Menteri Agama & Mendagri No. 9 & 8 Tahun 2006):
1. Daftar nama dan KTP pengguna rumah ibadah minimal 90 orang yang disahkan pejabat setempat
2. Dukungan masyarakat setempat minimal 60 orang yang disahkan lurah/kepala desa
3. Rekomendasi tertulis dari Forum Kerukunan Umat Beragama (FKUB) Kota Parepare
4. Rekomendasi tertulis dari Kepala Kantor Kementerian Agama Kota Parepare']),
    ('Jam Operasional',
    ARRAY['kapan jam pelayanan ppid buka',
    'jadwal buka kantor kemenag parepare',
    'jam kerja pelayanan ppid kementerian agama',
    'hari apa saja kantor kemenag buka',
    'jam buka ptsp kemenag'],
    ARRAY['Jadwal operasional Meja Pelayanan Terpadu Satu Pintu (PTSP) & PPID Kemenag Kota Parepare:
• Senin s.d. Kamis: Pukul 07.30 - 16.00 WITA (Istirahat pukul 12.00 - 13.30 WITA)
• Jumat: Pukul 07.30 - 16.30 WITA (Istirahat pukul 11.30 - 13.30 WITA)
• Sabtu, Minggu, & Libur Nasional: Tutup / Libur']),
    ('Saluran Pengaduan',
    ARRAY['bagaimana cara lapor pengaduan di kemenag parepare',
    'nomor kontak pengaduan kemenag',
    'layanan lapor pungli atau ketidakpuasan layanan',
    'saluran aspirasi dan pengaduan masyarakat'],
    ARRAY['Saluran resmi pengaduan dan aspirasi Kemenag Kota Parepare:
1. Portal Pengaduan Nasional: SP4N-LAPOR! (lapor.go.id)
2. Whistleblowing System Kemenag RI: wbs.kemenag.go.id
3. Kotak Saran & Pengaduan Fisik di Ruang PTSP Kantor Kemenag Kota Parepare, Jl. Jend. Sudirman No. 31, Parepare
4. Layanan tatap muka langsung dengan Petugas Meja Informasi & Pengaduan pada jam kerja kedinasan.']);
  end if;
end $$;