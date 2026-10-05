-- Supabase (PostgreSQL) Seed Data untuk PPID Kemenag Parepare

-- 1. Membersihkan data lama (opsional, hati-hati jika dijalankan di production)
TRUNCATE TABLE pengaturan, notifikasi, profil_konten, konten_statis, log_aktivitas, pengguna, pesan, keberatan, permohonan, regulasi, galeri, faqs, informasi_publik, berita RESTART IDENTITY CASCADE;

-- 3. Seed Data Tabel Informasi Publik
INSERT INTO informasi_publik (id, judul, kategori, deskripsi, tanggal_update, tahun, link_download, tipe_file, ukuran) VALUES
('INF-001', 'Profil Kementerian Agama Kota Parepare', 'Berkala', 'Dokumen profil lengkap yang memuat sejarah, visi, misi, kedudukan, tugas, dan fungsi Kemenag Kota Parepare.', '2024-01-15', 2024, '#', 'PDF', '2.5 MB'),
('INF-002', 'Laporan Kinerja Instansi Pemerintah (LKjIP) Tahun 2023', 'Berkala', 'Laporan yang menunjukkan tingkat pencapaian sasaran strategis Kemenag Parepare pada tahun 2023.', '2024-02-20', 2023, '#', 'PDF', '5.1 MB'),
('INF-003', 'Rencana Strategis (Renstra) 2020-2024', 'Setiap Saat', 'Dokumen perencanaan jangka menengah Kemenag Kota Parepare yang memuat visi, misi, dan arah kebijakan.', '2020-11-10', 2020, '#', 'PDF', '4.2 MB'),
('INF-004', 'Prosedur Layanan Pernikahan di KUA', 'Setiap Saat', 'Persyaratan lengkap, alur pelayanan, dan biaya penerimaan negara bukan pajak (PNBP) untuk layanan nikah.', '2023-08-05', 2023, '#', 'PDF', '1.1 MB'),
('INF-005', 'Daftar Aset Kemenag Parepare Tahun 2023', 'Setiap Saat', 'Rekapitulasi daftar Barang Milik Negara (BMN) yang dikelola oleh Kemenag Kota Parepare.', '2024-03-01', 2023, '#', 'Excel', '3.4 MB'),
('INF-007', 'Peringatan Waspada Penipuan Mengatasnamakan Kemenag', 'Serta Merta', 'Himbauan kepada masyarakat untuk mewaspadai modus penipuan berkedok bantuan pesantren atau rumah ibadah.', '2023-11-25', 2023, '#', 'PDF', '500 KB'),
('INF-008', 'Daftar Informasi Publik yang Dikecualikan Tahun 2024', 'Dikecualikan', 'Daftar jenis informasi yang tidak dapat diakses oleh publik sesuai dengan pengujian konsekuensi UU KIP.', '2024-01-05', 2024, '#', 'PDF', '1.2 MB'),
('INF-009', 'SOP Pelayanan Terpadu Satu Pintu (PTSP)', 'Setiap Saat', 'Standar Operasional Prosedur untuk seluruh layanan yang ada di ruang PTSP Kementerian Agama Kota Parepare.', '2023-09-12', 2023, '#', 'PDF', '2.8 MB'),
('INF-010', 'Data Statistik Keagamaan Parepare 2023', 'Berkala', 'Buku Statistik yang memuat data umat beragama, rumah ibadah, dan penyuluh agama di Kota Parepare.', '2024-04-18', 2023, '#', 'PDF', '6.5 MB'),
('INF-011', 'Laporan Realisasi Anggaran Triwulan I 2024', 'Berkala', 'Laporan detail mengenai penggunaan anggaran operasional pada tiga bulan pertama tahun 2024.', '2024-04-10', 2024, '#', 'Excel', '1.8 MB'),
('INF-012', 'Daftar Pejabat Struktural Kemenag Parepare', 'Setiap Saat', 'Struktur organisasi dan nama-nama pejabat yang menduduki jabatan struktural di lingkungan Kemenag Parepare.', '2024-01-20', 2024, '#', 'PDF', '900 KB'),
('INF-013', 'Maklumat Pelayanan PPID', 'Setiap Saat', 'Pernyataan kesanggupan dan kewajiban penyelenggara layanan dalam memberikan pelayanan informasi publik.', '2022-06-01', 2022, '#', 'Image', '300 KB');

-- 4. Seed Data Tabel FAQs
INSERT INTO faqs (question, answer) VALUES
('Apa itu PPID?', 'PPID (Pejabat Pengelola Informasi dan Dokumentasi) adalah pejabat yang bertanggung jawab di bidang penyimpanan, pendokumentasian, penyediaan, dan/atau pelayanan informasi di badan publik.'),
('Siapa saja yang berhak memohon informasi publik?', 'Setiap Warga Negara Indonesia (WNI) dan/atau Badan Hukum Indonesia yang dibuktikan dengan melampirkan identitas yang sah (KTP/Akta Notaris).'),
('Berapa lama proses pelayanan informasi publik?', 'Sesuai Undang-Undang KIP, waktu penyelesaian permohonan informasi publik maksimal 10 (sepuluh) hari kerja, dan dapat diperpanjang maksimal 7 (tujuh) hari kerja dengan alasan tertulis.'),
('Apakah ada biaya untuk mendapatkan informasi?', 'Penyediaan informasi publik tidak dipungut biaya (gratis). Namun, biaya penggandaan dokumen/informasi (fotokopi) atau biaya pengiriman (jika diminta via pos) ditanggung oleh pemohon.');

-- 5. Seed Data Tabel Galeri
INSERT INTO galeri (title, category, image_url, date) VALUES
('Pelayanan Terpadu Satu Pintu (PTSP)', 'Layanan', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800', '2024-02-15'),
('Sosialisasi Zakat dan Wakaf 2024', 'Kegiatan', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800', '2024-03-10'),
('Rapat Koordinasi Kemenag Parepare', 'Kegiatan', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800', '2024-01-20');

-- 6. Seed Data Tabel Regulasi
INSERT INTO regulasi (title, description, type, year, size) VALUES
('Undang-Undang Nomor 14 Tahun 2008', 'Tentang Keterbukaan Informasi Publik.', 'Undang-Undang', 2008, '1.2 MB'),
('Peraturan Pemerintah Nomor 61 Tahun 2010', 'Pelaksanaan Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik.', 'Peraturan Pemerintah', 2010, '850 KB'),
('PMA Nomor 9 Tahun 2022', 'Pedoman Pengelolaan Informasi dan Dokumentasi pada Kementerian Agama.', 'Peraturan Menteri', 2022, '2.1 MB');

-- 12. Seed Data Tabel Profil
INSERT INTO profil_konten (id, content_json) VALUES
('sejarah', '["Berdirinya Kementerian Agama Kota Parepare sejalan dengan sejarah pembentukan Kementerian Agama Republik Indonesia secara nasional yang bertujuan untuk melayani urusan keagamaan di wilayah Kota Parepare.", "Sejak awal berdirinya, Kemenag Parepare telah berperan aktif dalam membina kerukunan umat beragama, dan meningkatkan kualitas pendidikan madrasah.", "Dengan transformasi digital, PPID Kemenag Parepare hadir sebagai wujud nyata transparansi dan akuntabilitas dalam memberikan layanan informasi publik kepada masyarakat luas."]'),
('misi', '["Meningkatkan kualitas kesalehan umat beragama.", "Memperkuat kerukunan umat beragama dan wawasan kebangsaan.", "Meningkatkan layanan keagamaan yang adil, mudah dan merata.", "Meningkatkan layanan pendidikan yang merata dan bermutu.", "Meningkatkan produktivitas dan daya saing pendidikan.", "Memantapkan tata kelola pemerintahan yang baik (Good Governance)."]');

-- Tambahan Seed Data Profil
INSERT INTO profil_konten (id, content_json) VALUES
('sejarah_kepala', '["Fachruddin HS (Almarhum)","H. Zainuddin Dg Mabbunga (Almarhum)","K.H. Abdul Rahman Ambo Dalle (Almarhum)","Prof. Dr. K.H.M. Ali Yafie","K.H. Muhammad Abdul Pabbajah (Almarhum)","K.H. Muhammad Yusuf Hamzah (Almarhum)","K.H. Abdul Kadir (Almarhum)","H. Muhammad Ardani (Almarhum)","Andi Masso / Pjs (Almarhum)","Drs. H. Samaun Samad (Almarhum)","Drs. H. Abd. Gaffar Arman (Almarhum)","Drs. H. Hasby Saraka / Pjs (Almarhum)","Drs. H. M. Arief Fasieh (Almarhum)","H. Marzuki Madjid / Pjs","Drs. H. Hamka, M.Ag.","Drs. H. Alwy Mansyur, M.Pd.I. (Almarhum)","Drs. H. Hamka, M.Ag, Pjs.","Dr. H. Safaruddin, M.Ag.","Dr. H. Husain Abdullah, M.Ag","Drs. H. Iskandar Fellang, M.Pd (Plt)","Dr. Muhammad Idris Usman, S.Ag., MA (Plt)","Dr. H. Abdul Gaffar, S.Ag., M.A.","H. Fitriadi, S.Ag., M.Ag."]'),
('struktur_organisasi', '[{"jabatan": "KEPALA KANTOR KEMENTERIAN AGAMA", "nama": "Dr. H. FITRIADI, S.Ag., M.Ag", "nip": "197510101999031002"}, {"jabatan": "KEPALA SUB BAGIAN TATA USAHA", "nama": "Dr. H. SYAIFUL MAHSAN, S.Pt., M.Si", "nip": "197109141999031005"}, {"jabatan": "KEPALA SEKSI PENDIDIKAN MADRASAH", "nama": "Dr. H. HASAN BASRI, S.Ag., S.H., M.A", "nip": "197105022000031006"}, {"jabatan": "KEPALA SEKSI PENDIDIKAN AGAMA ISLAM", "nama": "H. LA JAMI, S.Ag., MA", "nip": "197212312005011025"}, {"jabatan": "KEPALA SEKSI BIMBINGAN MASYARAKAT ISLAM", "nama": "DRS. H. MUH. AMIN, M.A", "nip": "196809021998021001"}, {"jabatan": "KEPALA SEKSI PEND. DINIYAH DAN PONDOK PESANTREN", "nama": "H. HAMKA, S.Pd", "nip": "196803122005011006"}, {"jabatan": "PENYELENGGARA ZAKAT & WAKAF", "nama": "RIFDANINGSIH, S.E., M.E", "nip": "197702032006042001"}]'),
('struktur_kua', '[{"jabatan": "KEPALA KUA KEC. BACUKIKI", "nama": "TAUFIQUR RAHMAN, S.Pd.I., M.Pd.I", "nip": "197905182009011007"}, {"jabatan": "KEPALA KUA KEC. BACUKIKI BARAT", "nama": "AMIR SAID, S.Ag., M.A", "nip": "197503082006041007"}, {"jabatan": "KEPALA KUA KEC. SOREANG", "nama": "SYAHRUDDIN SAINUR, Lc.,M.Ag", "nip": "197405252011011001"}, {"jabatan": "KEPALA KUA KEC. UJUNG", "nama": "SABRULLAH, S.Ag", "nip": "197208192005011010"}]'),
('struktur_madrasah', '[{"jabatan": "KEPALA MAN 1 KOTA PAREPARE", "nama": "RUSMAN MADINA, S.Ag", "nip": "197704172007101004"}, {"jabatan": "KEPALA MAN 2 KOTA PAREPARE", "nama": "DRA. MARTINA", "nip": "196501011989032005"}, {"jabatan": "KEPALA MTsN KOTA PAREPARE", "nama": "MUHAMMAD RIDWAN. AR, S.Ag", "nip": "197001262007011015"}]');

-- 12.1 Seed Data Tabel Konten Statis (Baru)
INSERT INTO konten_statis (jenis, judul, isi) VALUES
('profil-ppid', 'Profil PPID Kemenag Kota Parepare', 'Pejabat Pengelola Informasi dan Dokumentasi (PPID) Kementerian Agama Kota Parepare dibentuk untuk menjawab amanat Undang-Undang Nomor 14 Tahun 2008 tentang Keterbukaan Informasi Publik. Kami berkomitmen untuk memberikan layanan informasi publik yang cepat, akurat, dan transparan.'),
('visi-misi', 'Mewujudkan layanan informasi publik yang transparan, akuntabel, dan mudah diakses oleh masyarakat.', '1. Meningkatkan kualitas tata kelola pelayanan informasi publik.\n2. Menyediakan informasi publik secara cepat, tepat waktu, biaya ringan, dan cara sederhana.\n3. Mengembangkan sistem informasi berbasis teknologi untuk kemudahan akses.'),
('maklumat-layanan', 'Maklumat Layanan', 'Kami berjanji dan sanggup untuk melaksanakan pelayanan sesuai dengan standar pelayanan yang telah ditetapkan, serta memberikan pelayanan sesuai dengan kewajiban dan akan melakukan perbaikan secara terus menerus.');

-- 2. Seed Data Tabel Berita
INSERT INTO berita (slug, tanggal, image_url, title, summary, content) VALUES
('kemenag-parepare-raih-penghargaan', '2024-05-10', 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800', 'Kemenag Parepare Raih Penghargaan Pelayanan Publik Terbaik', 'Kementerian Agama Kota Parepare kembali menorehkan prestasi gemilang dengan meraih penghargaan pelayanan publik terbaik tingkat provinsi.', '<p>Kementerian Agama Kota Parepare kembali menorehkan prestasi gemilang dengan meraih penghargaan pelayanan publik terbaik tingkat provinsi. Penghargaan ini diserahkan langsung oleh Bapak Gubernur...</p>'),
('sosialisasi-sertifikasi-halal-gratis', '2024-06-15', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800', 'Sosialisasi Program Sertifikasi Halal Gratis (SEHATI) 2024', 'Kemenag Parepare gencar melakukan sosialisasi program SEHATI untuk memfasilitasi pelaku UMKM mendapatkan sertifikat halal secara gratis.', '<p>Kemenag Parepare gencar melakukan sosialisasi program SEHATI untuk memfasilitasi pelaku UMKM mendapatkan sertifikat halal secara gratis. Program ini diharapkan dapat...</p>'),
('pembekalan-calon-jemaah-haji', '2024-07-20', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800', 'Pembekalan dan Manasik Calon Jemaah Haji Kota Parepare', 'Ratusan calon jemaah haji asal Kota Parepare mengikuti kegiatan pembekalan dan manasik haji yang diselenggarakan oleh Seksi PHU.', '<p>Ratusan calon jemaah haji asal Kota Parepare mengikuti kegiatan pembekalan dan manasik haji yang diselenggarakan oleh Seksi PHU...</p>');

-- 7. Seed Data Tabel Permohonan
INSERT INTO permohonan (id, kategori_pemohon, nik, nama, instansi, alamat, telepon, email, tujuan_penggunaan, file_ktp_url, tanggal, status, kebutuhan, catatan_internal) VALUES
('REQ-202407-001', 'kelompok', '7372000011112222', 'Budi Santoso', 'LSM Peduli Umat', 'Jl. Ahmad Yani No 12', '081122334455', 'budi@lsm.org', 'Penelitian tingkat transparansi', NULL, '2024-07-25', 'pending', 'Permohonan Salinan Laporan Kinerja Kemenag 2023', NULL),
('REQ-202407-002', 'perorangan', '7372111122223333', 'Siti Aminah', 'Universitas Hasanuddin', 'Jl. Perintis Kemerdekaan', '082233445566', 'siti@unhas.ac.id', 'Skripsi', NULL, '2024-07-24', 'diproses', 'Data Statistik Pondok Pesantren di Kota Parepare 5 Tahun Terakhir', 'Sedang menunggu balasan dari bidang PD Pontren'),
('REQ-202407-003', 'perorangan', '7372333344445555', 'Ahmad Rizal', 'Pribadi', 'Jl. Jenderal Sudirman', '083344556677', 'ahmad.rizal@gmail.com', 'Referensi Pribadi', NULL, '2024-07-22', 'selesai', 'Informasi Alur Pendaftaran Sertifikasi Halal bagi UMKM', NULL),
('REQ-202407-004', 'badan_hukum', '7372444455556666', 'Wahyu Pratama', 'Media Suara Rakyat', 'Jl. Veteran No 45', '084455667788', 'redaksi@suararakyat.com', 'Pemberitaan', NULL, '2024-07-20', 'ditolak', 'Data Rincian Penggunaan Dana Bantuan Operasional Pendidikan (Dikecualikan)', 'Informasi yang diminta dikecualikan sesuai SK');

-- 8. Seed Data Tabel Keberatan
INSERT INTO keberatan (id, tiket_referensi, nama_pemohon, telepon, email, kasus_posisi, alasan, lampiran_url, tanggal, status, tanggapan) VALUES
('OBJ-202407-001', 'REQ-202407-004', 'Wahyu Pratama', '084455667788', 'redaksi@suararakyat.com', 'Permohonan ditolak dengan alasan dikecualikan, padahal ini data publik.', 'Informasi yang diminta seharusnya bersifat terbuka untuk publik dan tidak masuk pengecualian', NULL, '2024-07-26', 'menunggu', NULL),
('OBJ-202406-002', 'REQ-202406-015', 'Dewi Lestari', '085566778899', 'dewi.lestari@gmail.com', 'Dokumen yang diberikan hanya sebagian.', 'Informasi yang diberikan tidak lengkap dan tidak sesuai dengan permohonan awal', NULL, '2024-06-15', 'selesai', 'Kami telah melengkapi dan mengirimkan dokumen tambahan sesuai dengan permintaan pemohon melalui email.');

-- 9. Seed Data Tabel Pesan
INSERT INTO pesan (sender, email, subject, snippet, date, is_read) VALUES
('Rizky Ananda', 'rizky.ananda@gmail.com', 'Pertanyaan Prosedur Legalisir Ijazah', 'Selamat siang, saya ingin menanyakan syarat-syarat legalisir ijazah...', '10 menit lalu', false),
('Humas Pemkot Parepare', 'humas@pareparekota.go.id', 'Undangan Rapat Koordinasi', 'Dengan hormat, mengundang Bapak/Ibu Kepala Kantor untuk hadir...', '1 jam lalu', false),
('Anisa Rahman', 'anisa.r@yahoo.com', 'Kendala Akses Sistem Informasi', 'Mohon bantuan, saya mengalami kendala saat mencoba mengunduh dokumen...', 'Kemarin', true),
('Tim Itjen Kemenag', 'itjen@kemenag.go.id', 'Jadwal Audit Kinerja Tahunan', 'Berikut kami lampirkan jadwal pelaksanaan audit kinerja tahunan untuk...', '2 hari lalu', true);

-- 10. Seed Data Tabel Pengguna
INSERT INTO pengguna (nama, email, role, status, last_login) VALUES
('Admin Utama', 'admin@ppid.kemenag.go.id', 'Admin PPID', 'Aktif', 'Hari ini, 08:30'),
('Petugas Frontdesk', 'frontdesk@ppid.kemenag.go.id', 'Petugas Layanan', 'Aktif', 'Hari ini, 07:45'),
('Kepala Seksi', 'kasi@ppid.kemenag.go.id', 'Pimpinan', 'Aktif', 'Kemarin, 14:20'),
('Staf Ahli IT', 'it.support@ppid.kemenag.go.id', 'Admin PPID', 'Nonaktif', '1 Bulan Lalu');

-- 11. Seed Data Tabel Log Aktivitas
INSERT INTO log_aktivitas (user_name, aksi, detail, ip_address, waktu) VALUES
('Admin Utama', 'Login Sistem', 'Admin Utama berhasil login ke sistem', '192.168.1.100', '2024-07-26 08:30:00'),
('Petugas Frontdesk', 'Memproses Permohonan', 'Memperbarui status permohonan REQ-202407-002 menjadi "diproses"', '192.168.1.102', '2024-07-26 09:15:22'),
('Admin Utama', 'Menambah Dokumen', 'Menambahkan dokumen INF-014 "Pedoman Pelayanan Haji"', '192.168.1.100', '2024-07-26 10:05:45'),
('Kepala Seksi', 'Merespon Keberatan', 'Memberikan tanggapan untuk keberatan OBJ-202406-002', '192.168.1.105', '2024-07-25 14:30:10');

-- 13. Seed Data Tabel Pengaturan
INSERT INTO pengaturan (kunci, nilai, deskripsi) VALUES
('site_name', 'PPID Kemenag Parepare', 'Nama situs web aplikasi PPID'),
('site_short_name', 'Kemenag Parepare', 'Singkatan / Akronim'),
('site_description', 'Layanan Pejabat Pengelola Informasi dan Dokumentasi (PPID) pada Kantor Kementerian Agama Kota Parepare.', 'Deskripsi meta situs'),
('contact_email', 'ppid@kemenagparepare.go.id', 'Email resmi kontak PPID'),
('contact_phone', '(0421) 123456', 'Nomor telepon resmi PPID'),
('contact_address', 'Jl. Jend. Sudirman No. 1, Kota Parepare, Sulawesi Selatan', 'Alamat Lengkap'),
('email_diterima_subject', '[PPID Parepare] Permohonan Informasi Diterima - {{ticket_id}}', 'Subjek email saat permohonan diterima'),
('email_diterima_body', 'Yth. {{nama_pemohon}},\n\nPermohonan informasi Anda telah kami terima dengan Nomor Tiket: {{ticket_id}}.\n\nTim PPID Kemenag Kota Parepare akan meninjau permohonan Anda selambatnya dalam 10 hari kerja.\n\nTerima kasih.', 'Isi email saat permohonan diterima'),
('email_selesai_subject', '[PPID Parepare] Permohonan Selesai - {{ticket_id}}', 'Subjek email saat permohonan selesai'),
('email_selesai_body', 'Yth. {{nama_pemohon}},\n\nInformasi yang Anda mohonkan telah tersedia. Silakan unduh dokumen pada lampiran email ini atau melalui portal PPID dengan memasukkan nomor tiket Anda.\n\nTerima kasih.', 'Isi email saat permohonan selesai');

-- 14. Seed Data Tabel Notifikasi
INSERT INTO notifikasi (judul, pesan, tipe, is_read) VALUES
('Permohonan Baru', 'Terdapat permohonan informasi baru dari Budi Santoso (REQ-202407-001).', 'info', false),
('Keberatan Masuk', 'Terdapat keberatan baru masuk (OBJ-202407-001) yang perlu ditinjau.', 'warning', false),
('Sistem Update', 'Pembaruan sistem PPID versi 1.1 telah berhasil dilakukan.', 'success', true);
