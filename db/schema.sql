-- Supabase (PostgreSQL) Schema untuk PPID Kemenag Parepare

-- 1. Membuat tabel berita
CREATE TABLE IF NOT EXISTS berita (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) NOT NULL UNIQUE,
    tanggal DATE NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT,
    status VARCHAR(50) DEFAULT 'Published',
    views INT DEFAULT 0
);

-- Fungsi atomic RPC untuk menambah pembaca / views berita
CREATE OR REPLACE FUNCTION increment_berita_views(berita_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE berita
  SET views = COALESCE(views, 0) + 1
  WHERE slug = berita_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_berita_views(TEXT) TO anon, authenticated, service_role;


-- 2. Membuat tipe ENUM untuk kategori informasi publik
DO $$ BEGIN
    CREATE TYPE kategori_info AS ENUM ('Berkala', 'Setiap Saat', 'Serta Merta', 'Dikecualikan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Membuat tabel informasi publik
CREATE TABLE IF NOT EXISTS informasi_publik (
    id VARCHAR(50) PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    kategori kategori_info NOT NULL,
    deskripsi TEXT,
    tanggal_update DATE,
    tahun INT,
    link_download VARCHAR(255),
    tipe_file VARCHAR(50),
    ukuran VARCHAR(50)
);

-- 4. Membuat tabel FAQs
CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL
);

-- 5. Tabel Galeri
CREATE TABLE IF NOT EXISTS galeri (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    date DATE NOT NULL
);

-- 6. Tabel Regulasi
CREATE TABLE IF NOT EXISTS regulasi (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    size VARCHAR(20)
);

-- 7. Tabel Permohonan
CREATE TABLE IF NOT EXISTS permohonan (
    id VARCHAR(20) PRIMARY KEY,
    kategori_pemohon VARCHAR(50),
    nik VARCHAR(50),
    nama VARCHAR(255) NOT NULL,
    instansi VARCHAR(255),
    alamat TEXT,
    telepon VARCHAR(50),
    email VARCHAR(255),
    tujuan_penggunaan TEXT,
    file_ktp_url TEXT,
    tanggal DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    kebutuhan TEXT NOT NULL,
    catatan_internal TEXT
);

-- 8. Tabel Keberatan
CREATE TABLE IF NOT EXISTS keberatan (
    id VARCHAR(20) PRIMARY KEY,
    tiket_referensi VARCHAR(20) NOT NULL,
    nama_pemohon VARCHAR(255) NOT NULL,
    telepon VARCHAR(50),
    email VARCHAR(255),
    kasus_posisi TEXT,
    alasan TEXT NOT NULL,
    lampiran_url VARCHAR(255),
    tanggal DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    tanggapan TEXT
);

-- 9. Tabel Pesan
CREATE TABLE IF NOT EXISTS pesan (
    id SERIAL PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    snippet TEXT NOT NULL,
    date VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false
);

-- 10. Tabel Pengguna
CREATE TABLE IF NOT EXISTS pengguna (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    last_login VARCHAR(50)
);

-- 11. Tabel Log Aktivitas
CREATE TABLE IF NOT EXISTS log_aktivitas (
    id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    aksi VARCHAR(255) NOT NULL,
    detail TEXT,
    ip_address VARCHAR(50),
    waktu VARCHAR(50) NOT NULL
);

-- 12. Tabel Profil (Statis)
CREATE TABLE IF NOT EXISTS profil_konten (
    id VARCHAR(50) PRIMARY KEY,
    content_json JSONB NOT NULL
);

-- 12.1 Tabel Konten Statis (Baru)
CREATE TABLE IF NOT EXISTS konten_statis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    jenis TEXT UNIQUE,
    judul TEXT,
    isi TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==========================================
-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
-- Mengaktifkan RLS dan mengizinkan operasi SELECT, INSERT, UPDATE, DELETE untuk aplikasi PPID

ALTER TABLE berita ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON berita;
DROP POLICY IF EXISTS "Allow all access" ON berita;
CREATE POLICY "Allow all access" ON berita FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE informasi_publik ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON informasi_publik;
DROP POLICY IF EXISTS "Allow all access" ON informasi_publik;
CREATE POLICY "Allow all access" ON informasi_publik FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON faqs;
DROP POLICY IF EXISTS "Allow all access" ON faqs;
CREATE POLICY "Allow all access" ON faqs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE galeri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON galeri;
DROP POLICY IF EXISTS "Allow all access" ON galeri;
CREATE POLICY "Allow all access" ON galeri FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE regulasi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON regulasi;
DROP POLICY IF EXISTS "Allow all access" ON regulasi;
CREATE POLICY "Allow all access" ON regulasi FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE permohonan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON permohonan;
DROP POLICY IF EXISTS "Allow public insert" ON permohonan;
DROP POLICY IF EXISTS "Allow all access" ON permohonan;
CREATE POLICY "Allow all access" ON permohonan FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE keberatan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON keberatan;
DROP POLICY IF EXISTS "Allow public insert" ON keberatan;
DROP POLICY IF EXISTS "Allow all access" ON keberatan;
CREATE POLICY "Allow all access" ON keberatan FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pesan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON pesan;
DROP POLICY IF EXISTS "Allow public insert" ON pesan;
DROP POLICY IF EXISTS "Allow all access" ON pesan;
CREATE POLICY "Allow all access" ON pesan FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE pengguna ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON pengguna;
DROP POLICY IF EXISTS "Allow all access" ON pengguna;
CREATE POLICY "Allow all access" ON pengguna FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE log_aktivitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON log_aktivitas;
DROP POLICY IF EXISTS "Allow all access" ON log_aktivitas;
CREATE POLICY "Allow all access" ON log_aktivitas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE profil_konten ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON profil_konten;
DROP POLICY IF EXISTS "Allow all access" ON profil_konten;
CREATE POLICY "Allow all access" ON profil_konten FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE konten_statis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON konten_statis;
DROP POLICY IF EXISTS "Allow all access" ON konten_statis;
CREATE POLICY "Allow all access" ON konten_statis FOR ALL USING (true) WITH CHECK (true);

-- 13. Tabel Pengaturan
CREATE TABLE IF NOT EXISTS pengaturan (
    kunci VARCHAR(50) PRIMARY KEY,
    nilai TEXT NOT NULL,
    deskripsi TEXT
);

ALTER TABLE pengaturan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON pengaturan;
DROP POLICY IF EXISTS "Allow all access" ON pengaturan;
CREATE POLICY "Allow all access" ON pengaturan FOR ALL USING (true) WITH CHECK (true);

-- 14. Tabel Notifikasi
CREATE TABLE IF NOT EXISTS notifikasi (
    id SERIAL PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    tipe VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notifikasi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read-only access" ON notifikasi;
DROP POLICY IF EXISTS "Allow all access" ON notifikasi;
CREATE POLICY "Allow all access" ON notifikasi FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- MIGRATIONS (Pembaruan Skema & Kolom)
-- ==========================================

-- 1. Migrasi Tabel Berita
ALTER TABLE berita ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Published';
ALTER TABLE berita ALTER COLUMN image_url TYPE TEXT;
ALTER TABLE berita ALTER COLUMN image_url DROP NOT NULL;

-- 2. Migrasi Tabel Informasi Publik (DIP)
ALTER TABLE informasi_publik ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Aktif';
ALTER TABLE informasi_publik ALTER COLUMN link_download TYPE TEXT;
ALTER TABLE informasi_publik ALTER COLUMN kategori TYPE VARCHAR(50);
ALTER TABLE informasi_publik ALTER COLUMN id SET DEFAULT ('INF-' || floor(random() * 900000 + 100000)::text);

-- 3. Migrasi Tabel Permohonan
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS kategori_pemohon VARCHAR(50);
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS nik VARCHAR(50);
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS nama VARCHAR(255);
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS instansi VARCHAR(255);
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS telepon VARCHAR(50);
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS tujuan_penggunaan TEXT;
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS file_ktp_url TEXT;
ALTER TABLE permohonan ALTER COLUMN file_ktp_url TYPE TEXT;
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS tanggal DATE;
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS kebutuhan TEXT;
ALTER TABLE permohonan ADD COLUMN IF NOT EXISTS catatan_internal TEXT;

-- 4. Migrasi Tabel Keberatan
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS tiket_referensi VARCHAR(20);
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS nama_pemohon VARCHAR(255);
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS telepon VARCHAR(50);
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS kasus_posisi TEXT;
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS alasan TEXT;
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS lampiran_url VARCHAR(255);
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS tanggal DATE;
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS status VARCHAR(50);
ALTER TABLE keberatan ADD COLUMN IF NOT EXISTS tanggapan TEXT;

-- ==========================================
-- STORAGE BUCKETS & POLICIES (Supabase Storage)
-- ==========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('berita', 'berita', true), ('dokumen', 'dokumen', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access berita" ON storage.objects;
CREATE POLICY "Public Access berita" ON storage.objects FOR ALL USING (bucket_id IN ('berita', 'dokumen')) WITH CHECK (bucket_id IN ('berita', 'dokumen'));

-- ==========================================
-- 15. TABEL PARTISIPASI PUBLIK & SURVEI KEPUASAN (SKM)
-- ==========================================
CREATE TABLE IF NOT EXISTS partisipasi_publik (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telepon VARCHAR(50),
    jenis VARCHAR(50) NOT NULL DEFAULT 'saran',
    judul VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'menunggu',
    tanggapan TEXT
);
ALTER TABLE partisipasi_publik ADD COLUMN IF NOT EXISTS tanggapan TEXT;
ALTER TABLE partisipasi_publik ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON partisipasi_publik;
CREATE POLICY "Allow all access" ON partisipasi_publik FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS survei_kepuasan (
    id SERIAL PRIMARY KEY,
    nama VARCHAR(255),
    email VARCHAR(255),
    telepon VARCHAR(50),
    pekerjaan VARCHAR(100),
    pendidikan VARCHAR(50),
    jenis_layanan VARCHAR(100),
    skor_persyaratan INT DEFAULT 4,
    skor_prosedur INT DEFAULT 4,
    skor_waktu INT DEFAULT 4,
    skor_biaya INT DEFAULT 4,
    skor_produk INT DEFAULT 4,
    skor_kompetensi INT DEFAULT 4,
    skor_perilaku INT DEFAULT 4,
    skor_penanganan INT DEFAULT 4,
    skor_sarana INT DEFAULT 4,
    kritik_saran TEXT,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE
);
ALTER TABLE survei_kepuasan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access" ON survei_kepuasan;
CREATE POLICY "Allow all access" ON survei_kepuasan FOR ALL USING (true) WITH CHECK (true);

