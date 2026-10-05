export type KategoriInformasi = 'Berkala' | 'Setiap Saat' | 'Serta Merta' | 'Dikecualikan';

export interface DataInformasi {
  id: string;
  judul: string;
  kategori: KategoriInformasi;
  deskripsi: string;
  tanggal_update: string;
  tahun: number;
  link_download?: string;
  tipe_file?: string;
  ukuran?: string;
}

export const defaultBerita = [
  {
    id: '1',
    slug: 'kemenag-parepare-raih-penghargaan',
    date: '2024-05-10',
    imageUrl: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800',
    title: 'Kemenag Parepare Raih Penghargaan Pelayanan Publik Terbaik',
    summary: 'Kementerian Agama Kota Parepare kembali menorehkan prestasi gemilang dengan meraih penghargaan pelayanan publik terbaik tingkat provinsi.',
    content: '<p>Kementerian Agama Kota Parepare kembali menorehkan prestasi gemilang dengan meraih penghargaan pelayanan publik terbaik tingkat provinsi. Penghargaan ini diserahkan langsung oleh Bapak Gubernur...</p>'
  },
  {
    id: '2',
    slug: 'sosialisasi-sertifikasi-halal-gratis',
    date: '2024-06-15',
    imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800',
    title: 'Sosialisasi Program Sertifikasi Halal Gratis (SEHATI) 2024',
    summary: 'Kemenag Parepare gencar melakukan sosialisasi program SEHATI untuk memfasilitasi pelaku UMKM mendapatkan sertifikat halal secara gratis.',
    content: '<p>Kemenag Parepare gencar melakukan sosialisasi program SEHATI untuk memfasilitasi pelaku UMKM mendapatkan sertifikat halal secara gratis. Program ini diharapkan dapat...</p>'
  },
  {
    id: '3',
    slug: 'pembekalan-calon-jemaah-haji',
    date: '2024-07-20',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
    title: 'Pembekalan dan Manasik Calon Jemaah Haji Kota Parepare',
    summary: 'Ratusan calon jemaah haji asal Kota Parepare mengikuti kegiatan pembekalan dan manasik haji yang diselenggarakan oleh Seksi PHU.',
    content: '<p>Ratusan calon jemaah haji asal Kota Parepare mengikuti kegiatan pembekalan dan manasik haji yang diselenggarakan oleh Seksi PHU...</p>'
  }
];

export const defaultInformasiPublik: DataInformasi[] = [
  {
    id: 'INF-001',
    judul: 'Profil Kementerian Agama Kota Parepare',
    kategori: 'Berkala',
    deskripsi: 'Dokumen profil lengkap yang memuat sejarah, visi, misi, kedudukan, tugas, dan fungsi Kemenag Kota Parepare.',
    tanggal_update: '2024-01-15',
    tahun: 2024,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '2.5 MB'
  },
  {
    id: 'INF-002',
    judul: 'Laporan Kinerja Instansi Pemerintah (LKjIP) Tahun 2023',
    kategori: 'Berkala',
    deskripsi: 'Laporan yang menunjukkan tingkat pencapaian sasaran strategis Kemenag Parepare pada tahun 2023.',
    tanggal_update: '2024-02-20',
    tahun: 2023,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '5.1 MB'
  },
  {
    id: 'INF-003',
    judul: 'Rencana Strategis (Renstra) 2020-2024',
    kategori: 'Setiap Saat',
    deskripsi: 'Dokumen perencanaan jangka menengah Kemenag Kota Parepare yang memuat visi, misi, dan arah kebijakan.',
    tanggal_update: '2020-11-10',
    tahun: 2020,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '4.2 MB'
  },
  {
    id: 'INF-004',
    judul: 'Prosedur Layanan Pernikahan di KUA',
    kategori: 'Setiap Saat',
    deskripsi: 'Persyaratan lengkap, alur pelayanan, dan biaya penerimaan negara bukan pajak (PNBP) untuk layanan nikah.',
    tanggal_update: '2023-08-05',
    tahun: 2023,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '1.1 MB'
  },
  {
    id: 'INF-005',
    judul: 'Daftar Aset Kemenag Parepare Tahun 2023',
    kategori: 'Setiap Saat',
    deskripsi: 'Rekapitulasi daftar Barang Milik Negara (BMN) yang dikelola oleh Kemenag Kota Parepare.',
    tanggal_update: '2024-03-01',
    tahun: 2023,
    link_download: '#',
    tipe_file: 'Excel',
    ukuran: '3.4 MB'
  },
  {
    id: 'INF-007',
    judul: 'Peringatan Waspada Penipuan Mengatasnamakan Kemenag',
    kategori: 'Serta Merta',
    deskripsi: 'Himbauan kepada masyarakat untuk mewaspadai modus penipuan berkedok bantuan pesantren atau rumah ibadah.',
    tanggal_update: '2023-11-25',
    tahun: 2023,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '500 KB'
  },
  {
    id: 'INF-008',
    judul: 'Daftar Informasi Publik yang Dikecualikan Tahun 2024',
    kategori: 'Dikecualikan',
    deskripsi: 'Daftar jenis informasi yang tidak dapat diakses oleh publik sesuai dengan pengujian konsekuensi UU KIP.',
    tanggal_update: '2024-01-05',
    tahun: 2024,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '1.2 MB'
  },
  {
    id: 'INF-009',
    judul: 'SOP Pelayanan Terpadu Satu Pintu (PTSP)',
    kategori: 'Setiap Saat',
    deskripsi: 'Standar Operasional Prosedur untuk seluruh layanan yang ada di ruang PTSP Kementerian Agama Kota Parepare.',
    tanggal_update: '2023-09-12',
    tahun: 2023,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '2.8 MB'
  },
  {
    id: 'INF-010',
    judul: 'Data Statistik Keagamaan Parepare 2023',
    kategori: 'Berkala',
    deskripsi: 'Buku Statistik yang memuat data umat beragama, rumah ibadah, dan penyuluh agama di Kota Parepare.',
    tanggal_update: '2024-04-18',
    tahun: 2023,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '6.5 MB'
  },
  {
    id: 'INF-011',
    judul: 'Laporan Realisasi Anggaran Triwulan I 2024',
    kategori: 'Berkala',
    deskripsi: 'Laporan detail mengenai penggunaan anggaran operasional pada tiga bulan pertama tahun 2024.',
    tanggal_update: '2024-04-10',
    tahun: 2024,
    link_download: '#',
    tipe_file: 'Excel',
    ukuran: '1.8 MB'
  },
  {
    id: 'INF-012',
    judul: 'Daftar Pejabat Struktural Kemenag Parepare',
    kategori: 'Setiap Saat',
    deskripsi: 'Struktur organisasi dan nama-nama pejabat yang menduduki jabatan struktural di lingkungan Kemenag Parepare.',
    tanggal_update: '2024-01-20',
    tahun: 2024,
    link_download: '#',
    tipe_file: 'PDF',
    ukuran: '900 KB'
  },
  {
    id: 'INF-013',
    judul: 'Maklumat Pelayanan PPID',
    kategori: 'Setiap Saat',
    deskripsi: 'Pernyataan kesanggupan dan kewajiban penyelenggara layanan dalam memberikan pelayanan informasi publik.',
    tanggal_update: '2022-06-01',
    tahun: 2022,
    link_download: '#',
    tipe_file: 'Image',
    ukuran: '300 KB'
  }
];

export const defaultFAQs = [
  {
    id: 1,
    question: 'Apa itu PPID?',
    answer: 'PPID (Pejabat Pengelola Informasi dan Dokumentasi) adalah pejabat yang bertanggung jawab di bidang penyimpanan, pendokumentasian, penyediaan, dan/atau pelayanan informasi di badan publik.'
  },
  {
    id: 2,
    question: 'Siapa saja yang berhak memohon informasi publik?',
    answer: 'Setiap Warga Negara Indonesia (WNI) dan/atau Badan Hukum Indonesia yang dibuktikan dengan melampirkan identitas yang sah (KTP/Akta Notaris).'
  },
  {
    id: 3,
    question: 'Berapa lama proses pelayanan informasi publik?',
    answer: 'Sesuai Undang-Undang KIP, waktu penyelesaian permohonan informasi publik maksimal 10 (sepuluh) hari kerja, dan dapat diperpanjang maksimal 7 (tujuh) hari kerja dengan alasan tertulis.'
  },
  {
    id: 4,
    question: 'Apakah ada biaya untuk mendapatkan informasi?',
    answer: 'Penyediaan informasi publik tidak dipungut biaya (gratis). Namun, biaya penggandaan dokumen/informasi (fotokopi) atau biaya pengiriman (jika diminta via pos) ditanggung oleh pemohon.'
  }
];

export const defaultSejarah = "Instansi Kementerian Agama yang pertama dibentuk di Kota Parepare adalah Kantor Urusan Agama Kabupaten Parepare, yang mewilayahi 5 (lima) kewedanan yaitu: Parepare, Barru, Pinrang, Sidenreng, dan Enrekang pada tanggal 16 Juni 1951. Hal ini merupakan peran besar dari seorang ulama besar, K.H. Abdul Rahman Ambo Dalle.";

export const defaultVisi = "Terwujudnya Masyarakat Kota Parepare yang Taat Beragama, Rukun, Cerdas dan Sejahtera Lahir Batin";

export const defaultMisi = [
  "Meningkatkan kualitas kesalehan umat beragama.",
  "Memperkuat kerukunan umat beragama dan wawasan kebangsaan.",
  "Meningkatkan layanan keagamaan yang adil, mudah dan merata.",
  "Meningkatkan layanan pendidikan yang merata dan bermutu.",
  "Meningkatkan produktivitas dan daya saing pendidikan.",
  "Memantapkan tata kelola pemerintahan yang baik (Good Governance)."
];

export const defaultSejarahKepala = [
  "Fachruddin HS (Almarhum)",
  "H. Zainuddin Dg Mabbunga (Almarhum)",
  "K.H. Abdul Rahman Ambo Dalle (Almarhum)",
  "Prof. Dr. K.H.M. Ali Yafie",
  "K.H. Muhammad Abdul Pabbajah (Almarhum)",
  "K.H. Muhammad Yusuf Hamzah (Almarhum)",
  "K.H. Abdul Kadir (Almarhum)",
  "H. Muhammad Ardani (Almarhum)",
  "Andi Masso / Pjs (Almarhum)",
  "Drs. H. Samaun Samad (Almarhum)",
  "Drs. H. Abd. Gaffar Arman (Almarhum)",
  "Drs. H. Hasby Saraka / Pjs (Almarhum)",
  "Drs. H. M. Arief Fasieh (Almarhum)",
  "H. Marzuki Madjid / Pjs",
  "Drs. H. Hamka, M.Ag.",
  "Drs. H. Alwy Mansyur, M.Pd.I. (Almarhum)",
  "Drs. H. Hamka, M.Ag, Pjs.",
  "Dr. H. Safaruddin, M.Ag.",
  "Dr. H. Husain Abdullah, M.Ag",
  "Drs. H. Iskandar Fellang, M.Pd (Plt)",
  "Dr. Muhammad Idris Usman, S.Ag., MA (Plt)",
  "Dr. H. Abdul Gaffar, S.Ag., M.A.",
  "Dr. H. Fitriadi, S.Ag., M.Ag."
];

export const defaultStrukturOrganisasi = [
  { jabatan: "KEPALA KANTOR KEMENTERIAN AGAMA", nama: "Dr. H. FITRIADI, S.Ag., M.Ag", nip: "197510101999031002" },
  { jabatan: "KEPALA SUB BAGIAN TATA USAHA", nama: "Dr. H. SYAIFUL MAHSAN, S.Pt., M.Si", nip: "197109141999031005" },
  { jabatan: "KEPALA SEKSI PENDIDIKAN MADRASAH", nama: "Dr. H. HASAN BASRI, S.Ag., S.H., M.A", nip: "197105022000031006" },
  { jabatan: "KEPALA SEKSI PENDIDIKAN AGAMA ISLAM", nama: "H. LA JAMI, S.Ag., MA", nip: "197212312005011025" },
  { jabatan: "KEPALA SEKSI BIMBINGAN MASYARAKAT ISLAM", nama: "DRS. H. MUH. AMIN, M.A", nip: "196809021998021001" },
  { jabatan: "KEPALA SEKSI PEND. DINIYAH DAN PONDOK PESANTREN", nama: "H. HAMKA, S.Pd", nip: "196803122005011006" },
  { jabatan: "PENYELENGGARA ZAKAT & WAKAF", nama: "RIFDANINGSIH, S.E., M.E", nip: "197702032006042001" }
];

export const defaultStrukturKUA = [
  { jabatan: "KEPALA KUA KEC. BACUKIKI", nama: "TAUFIQUR RAHMAN, S.Pd.I., M.Pd.I", nip: "197905182009011007" },
  { jabatan: "KEPALA KUA KEC. BACUKIKI BARAT", nama: "AMIR SAID, S.Ag., M.A", nip: "197503082006041007" },
  { jabatan: "KEPALA KUA KEC. SOREANG", nama: "SYAHRUDDIN SAINUR, Lc.,M.Ag", nip: "197405252011011001" },
  { jabatan: "KEPALA KUA KEC. UJUNG", nama: "SABRULLAH, S.Ag", nip: "197208192005011010" }
];

export const defaultStrukturMadrasah = [
  { jabatan: "KEPALA MAN 1 KOTA PAREPARE", nama: "RUSMAN MADINA, S.Ag", nip: "197704172007101004" },
  { jabatan: "KEPALA MAN 2 KOTA PAREPARE", nama: "DRA. MARTINA", nip: "196501011989032005" },
  { jabatan: "KEPALA MTsN KOTA PAREPARE", nama: "MUHAMMAD RIDWAN. AR, S.Ag", nip: "197001262007011015" }
];

export const defaultMaklumat = "Kami Menyatakan Sanggup Menyelenggarakan Pelayanan Informasi Publik Sesuai Standar Layanan Yang Telah Ditetapkan, Dan Apabila Tidak Menepati Janji, Kami Siap Menerima Sanksi Sesuai Peraturan Perundang-Undangan Yang Berlaku.";

