'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

/* =========================================================
   TIPE DATA
   ========================================================= */
interface LayananDetail {
  kodeLayanan: string;
  nama: string;
  sasaran: 'PNS' | 'PNS & PPPK' | 'Seluruh ASN' | 'Seluruh Masyarakat';
  deskripsi: string;
  labelPanduan: string;
  urlPanduan: string;
  labelFormulir?: string;
  urlFormulir?: string;
}

interface KelompokLayananPemerintah {
  huruf: string;
  judul: string;
  subjudul: string;
  layanan: LayananDetail[];
}

/* =========================================================
   DATA LAYANAN
   ========================================================= */
const DATA_LAYANAN_KEMENAG: KelompokLayananPemerintah[] = [
  {
    huruf: 'A',
    judul: 'Layanan Pengembangan Karir dan Kepangkatan',
    subjudul: 'Fasilitas kenaikan pangkat berkala, legalitas gelar akademik, tugas belajar, dan pensiun.',
    layanan: [
      {
        kodeLayanan: 'A.1',
        nama: 'Usul Kenaikan Pangkat (KP) PNS',
        sasaran: 'PNS',
        deskripsi: 'Pengusulan berkas kenaikan pangkat reguler, pilihan struktural, dan jabatan fungsional periode BKN (Februari, April, Juni, Agustus, Oktober, Desember).',
        labelPanduan: 'SOP & Dokumen Syarat (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1G37xJ-4qX8EmyVhpTi9XRZcqHjaNoquD/view?usp=sharing',
        labelFormulir: 'Formulir Usul KP',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSdXgnO2XkjtP7b7pbjxxjLITXDVFC7Bv-PUOt4HyiqdCXCXLA/viewform'
      },
      {
        kodeLayanan: 'A.2',
        nama: 'Usul Kenaikan Jenjang Jabatan Fungsional',
        sasaran: 'PNS',
        deskripsi: 'Pengajuan kenaikan jenjang jabatan bagi Pejabat Fungsional di lingkungan Kementerian Agama Kota Parepare yang telah memenuhi Angka Kredit (AK) yang disyaratkan dan lulus Uji Kompetensi.',
        labelPanduan: 'Format Berkas & Syarat (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/14i_gQmsER59yZ9b-4bUeAiOysogXJkdE/view?usp=sharing',
        labelFormulir: 'Formulir Kenaikan Jenjang',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSf3Kg0Y2GBxevEagh8YMsYzqam1G1bjAy1uTLWWPV4X1G_IlA/viewform'
      },
      {
        kodeLayanan: 'A.3',
        nama: 'Usul Pencantuman Gelar Akademik',
        sasaran: 'PNS',
        deskripsi: 'Pengajuan pengesahan dan pencatatan gelar akademik (S1, S2, S3) yang diperoleh setelah pengangkatan pertama sebagai PNS pada pangkalan data kepegawaian.',
        labelPanduan: 'Format Berkas & Syarat (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1ydTXRVenjneNpilA8lFvjFlXHW0SsXnk/view?usp=sharing',
        labelFormulir: 'Formulir Usul Gelar',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLScMi2dBJM1NjitjmZE0UUr0-bji2cEj59EwF-rfS_wnEZMxyQ/viewform'
      },
      {
        kodeLayanan: 'A.4',
        nama: 'Usul Pencantuman Gelar Profesi',
        sasaran: 'PNS',
        deskripsi: 'Pengusulan pencatatan gelar profesi resmi pendidik/fungsional (misal: Gr. / Guru Profesional) pada sistem informasi aparatur negara.',
        labelPanduan: 'SOP Dokumen Profesi (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1eWGlqYpaAkiBubL4LikmWEGtjgr9x5Am/view?usp=sharing',
        labelFormulir: 'Formulir Gelar Profesi',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLScWSY_OKbhM5H-oxqDmRJ3cQoGxRNB0eTMtP5XF1C_7bJgfTg/viewform?usp=dialog'
      },
      {
        kodeLayanan: 'A.5',
        nama: 'Usul Pensiun Pegawai Negeri Sipil',
        sasaran: 'PNS',
        deskripsi: 'Pengajuan resmi penetapan surat keputusan pemberhentian dengan hak pensiun (Batas Usia Pensiun/BUP, Janda/Duda, atau Atas Permintaan Sendiri).',
        labelPanduan: 'Checklist Berkas Pensiun (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1xCP0zc2PkjGUXyYEIiSjm5svPTvIxjjb/view?usp=sharing',
        labelFormulir: 'Formulir Usul Pensiun',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSdoyPJhZuMBsOlUVtmasfVpqj-NOI9TqK5n4YDyp9KFe-MwXw/viewform'
      },
      {
        kodeLayanan: 'A.6',
        nama: 'Usul Surat Keterangan Memiliki Ijazah (SKMI)',
        sasaran: 'PNS',
        deskripsi: 'Permohonan dokumen pengganti izin belajar bagi pegawai yang telah menyelesaikan pendidikan Strata-1 sebelum diangkat menjadi CPNS/PNS.',
        labelPanduan: 'Blanko & Ketentuan SKMI (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1cSiFDEayikiysmBdrFijnk-0at5IFfls/view?usp=sharing',
        labelFormulir: 'Formulir Usul SKMI',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSfYQM2Ds5rgKE_hmzzHAHB2pDnwN3I5Jdz-0CT37dkNruQYfg/viewform'
      },
      {
        kodeLayanan: 'A.7',
        nama: 'Usul Tugas Belajar & Izin Belajar',
        sasaran: 'PNS',
        deskripsi: 'Pengusulan rekomendasi studi dan izin resmi melanjutkan pendidikan formal bagi pegawai kantor dan guru madrasah di lingkungan Kemenag Parepare.',
        labelPanduan: 'Regulasi & Format Izin (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1uzJewOqNX7uU5brD_DlVVgZOzfAAgx6q/view?usp=sharing',
        labelFormulir: 'Formulir Izin Belajar',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSfRegdEjQddNKQQker3t5dIcaQfsEMOCTHCFEtQaTJ68KeiIA/viewform?usp=sf_link'
      },
      {
        kodeLayanan: 'A.8',
        nama: 'Peninjauan Masa Kerja (PMK)',
        sasaran: 'PNS',
        deskripsi: 'Pengajuan perhitungan kembali masa kerja yang relevan (sebelum diangkat menjadi CPNS) untuk disesuaikan dengan pangkat dan gaji pokok ASN.',
        labelPanduan: 'Format Berkas & Syarat (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/14kooPMRQP8esu3L65CU7QdZmKd7PZzfm/view?usp=sharing',
        labelFormulir: 'Formulir Pendaftaran SLKS',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLScqLgMjEn2i-ngU20YDlHUXNP9DPh1CdTFa-mK8YWYHb1AkQw/viewform?usp=dialog'
      },
      {
        kodeLayanan: 'A.9',
        nama: 'Usul Mutasi Pegawai',
        sasaran: 'PNS',
        deskripsi: 'Fasilitas pengajuan perpindahan tugas, wilayah, atau instansi kerja bagi PNS sesuai dengan formasi, kebutuhan, dan persetujuan pejabat berwenang.',
        labelPanduan: 'SOP & Syarat Mutasi (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1hEHxDh7ueXfciIPOvR7CHt2u8G-xoe-R/view?usp=sharing',
        labelFormulir: 'Formulir Usul Mutasi',
        urlFormulir: 'https://forms.gle/7pctp7yoxTeCKo5F6'
      },
      {
        kodeLayanan: 'A.10',
        nama: 'Pengisian Jabatan',
        sasaran: 'PNS',
        deskripsi: 'Pengusulan penempatan pegawai ke dalam suatu jabatan fungsional, pelaksana, maupun struktural sesuai dengan kualifikasi dan kompetensi yang dibutuhkan.',
        labelPanduan: 'Dokumen Syarat Pengisian (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1hBDCFGFSOn6kK-Rlkxt2TVNdAovRrNKI/view?usp=sharing',
        labelFormulir: 'Formulir Usul Jabatan',
        urlFormulir: 'https://forms.gle/7pctp7yoxTeCKo5F6'
      },
      {
        kodeLayanan: 'A.11',
        nama: 'Inpassing JF PJPH',
        sasaran: 'PNS',
        deskripsi: 'Layanan penyesuaian atau penyetaraan ke dalam Jabatan Fungsional Penyelenggara Jaminan Produk Halal bagi PNS yang memenuhi kualifikasi.',
        labelPanduan: 'Format Berkas Inpassing (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1rBNoX0kGWc_1EmJb1NcxMp_GIrDv-xRk/view?usp=sharing',
        labelFormulir: 'Formulir Usul Inpassing',
        urlFormulir: 'https://forms.gle/7pctp7yoxTeCKo5F6'
      }
    ]
  },
  {
    huruf: 'B',
    judul: 'Layanan Kesejahteraan dan Penghargaan',
    subjudul: 'Pemberian tanda kehormatan dan pengakuan atas dedikasi pengabdian ASN.',
    layanan: [
      {
        kodeLayanan: 'B.1',
        nama: 'Usul Satyalancana Karya Satya (SLKS)',
        sasaran: 'PNS',
        deskripsi: 'Pengusulan penganugerahan tanda kehormatan Presiden RI atas kesetiaan dan pengabdian ASN secara terus-menerus selama 10, 20, atau 30 tahun.',
        labelPanduan: 'Pedoman Berkas Usulan (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1O8upER9aHNhd8zPorE8skVwLrQKUBsRG/view?usp=sharing',
        labelFormulir: 'Formulir Pendaftaran SLKS',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLScqLgMjEn2i-ngU20YDlHUXNP9DPh1CdTFa-mK8YWYHb1AkQw/viewform?usp=dialog'
      },
      {
        kodeLayanan: 'B.2',
        nama: 'Format Permohonan Surat Cuti (PPPK & PNS)',
        sasaran: 'PNS & PPPK',
        deskripsi: 'Formulir resmi permohonan izin cuti (Tahunan, Sakit, Alasan Penting, Melahirkan, dan Besar) sesuai Peraturan BKN No. 24/2017 & No. 7/2021.',
        labelPanduan: 'Unduh Format Blanko Cuti (Google Drive)',
        urlPanduan: 'https://drive.google.com/drive/folders/1UAdx1xtEzcZTqmQjGynzlVS9VwOmM6If'
      }
    ]
  },
  {
    huruf: 'C',
    judul: 'Layanan Administrasi Rutin dan Pendukung',
    subjudul: 'Pemenuhan kewajiban pelaporan kinerja, perizinan cuti kerja, konsultasi teknis, dan survei mutu.',
    layanan: [
      {
        kodeLayanan: 'C.1',
        nama: 'Konsultasi & Pendampingan Teknis Kepegawaian',
        sasaran: 'Seluruh ASN',
        deskripsi: 'Fasilitas konsultasi tatap muka atau daring terkait penanganan hambatan berkas kepegawaian, verifikasi data, dan regulasi ASN bersama tim Subbag TU.',
        labelPanduan: 'SOP Konsultasi Teknis',
        urlPanduan: 'https://drive.google.com/file/d/13Lnh4yRnBaGkVLjAHl5FQozGPG2faqJi/view?usp=sharing',
        labelFormulir: 'Registrasi Jadwal Konsultasi',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSdFmsHeoGKeBsR4XtHsB5WdJUhh42HPi8yTb5xfiuq8BiSWPw/viewform?usp=dialog'
      },
      {
        kodeLayanan: 'C.2',
        nama: 'Unggah Laporan Capaian Kinerja Bulanan (LCKB)',
        sasaran: 'PNS & PPPK',
        deskripsi: 'Pintu pengunggahan digital berkas laporan realisasi kinerja bulanan bagi seluruh pejabat fungsional, guru madrasah, dan pelaksana teknis.',
        labelPanduan: 'Format Baku LCKB (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1RqGRj-NwnM3CuThOzx1M0HSM6MdZLxv2/view?usp=sharing',
        labelFormulir: 'Portal Unggah LCKB',
        urlFormulir: 'https://docs.google.com/forms/d/1g43y26ZJqC3Jt33K8xSgpcXHkm4cllFB23ccS3R6JAI/edit'
      },
      {
        kodeLayanan: 'C.3',
        nama: 'Survei Kepuasan Layanan Masyarakat',
        sasaran: 'Seluruh Masyarakat',
        deskripsi: 'Instrumen survei kepuasan masyarakat untuk mengukur mutu, kecepatan, dan transparansi pelayanan kepegawaian Kantor Kemenag Kota Parepare.',
        labelPanduan: 'Informasi Penilaian SKM',
        urlPanduan: 'https://drive.google.com/file/d/1vfRFnVWrHRL4Uq13FqG-evYlggLorzJe/view?usp=sharing',
        labelFormulir: 'Kuesioner Survei SKM',
        urlFormulir: 'https://skm.go.id/share/instansi/0dc5ab4e-d242-49b3-9755-20739a7f7856/2'
      },
      {
        kodeLayanan: 'C.4',
        nama: 'Format Surat Keterangan Lupa Absen (PNS & PPPK)',
        sasaran: 'PNS & PPPK',
        deskripsi: 'Template resmi surat pertanggungjawaban bukti kehadiran bagi pegawai atau guru madrasah yang mengalami lupa absen atau kendala teknis pada aplikasi presensi elektronik (Pusaka/Presensi Online) untuk disahkan atasan langsung.',
        labelPanduan: 'Unduh Format Surat Lupa Absen (Google Drive)',
        urlPanduan: 'https://docs.google.com/document/d/1DEoWj5mDrTXZhgjAkwdPH5Tg03TyLhij/edit?usp=sharing&ouid=112206925890698995511&rtpof=true&sd=true',
        labelFormulir: 'Registrasi Jadwal Konsultasi',
        urlFormulir: 'https://forms.gle/7pctp7yoxTeCKo5F6'
      },
      {
        kodeLayanan: 'C.5',
        nama: 'Perbaikan Data ASN',
        sasaran: 'Seluruh ASN',
        deskripsi: 'Layanan pemutakhiran, sinkronisasi, dan perbaikan anomali data profil kepegawaian untuk diintegrasikan pada aplikasi kepegawaian nasional.',
        labelPanduan: 'Daftar Bukti Dukung (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1uFUalk2-oBcyPpik7Ox1MVCdi-YXfZ1R/view?usp=sharing',
        labelFormulir: 'Formulir Perbaikan Data',
        urlFormulir: 'https://forms.gle/7pctp7yoxTeCKo5F6'
      },
      {
        kodeLayanan: 'C.6',
        nama: 'Penyesuaian Simpeg5',
        sasaran: 'Seluruh ASN',
        deskripsi: 'Permohonan penyelesaian kendala teknis atau penyesuaian pembaruan data spesifik yang belum tersinkronisasi pada platform Simpeg5 Kementerian Agama.',
        labelPanduan: 'Panduan Kendala Simpeg5 (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1bNxNXymIdRnOwVmUlsw6q0L6kpWoK08G/view?usp=sharing',
        labelFormulir: 'Formulir Penyesuaian Simpeg5',
        urlFormulir: 'https://forms.gle/7pctp7yoxTeCKo5F6'
      },
      {
        kodeLayanan: 'C.7',
        nama: 'Layanan Kepegawaian Lainnya',
        sasaran: 'Seluruh ASN',
        deskripsi: 'Fasilitas bantuan untuk pengajuan administrasi atau urusan kepegawaian yang tidak tercantum secara spesifik pada katalog layanan di atas.',
        labelPanduan: 'Ketentuan Layanan Umum (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1m-KuDE1Df8Eq-SGkPamt4aDPO6brFy-K/view?usp=sharing',
        labelFormulir: 'Formulir Bantuan Lainnya',
        urlFormulir: 'https://forms.gle/7pctp7yoxTeCKo5F6'
      }
    ]
  }
];

/* =========================================================
   KONSTANTA, HELPER, IKON
   ========================================================= */
type Peran = 'Semua' | 'PNS' | 'PPPK' | 'Masyarakat';

const DAFTAR_PERAN: { nilai: Peran; label: string }[] = [
  { nilai: 'Semua', label: 'Semua' },
  { nilai: 'PNS', label: 'PNS' },
  { nilai: 'PPPK', label: 'PPPK' },
  { nilai: 'Masyarakat', label: 'Masyarakat Umum' },
];

const LANGKAH = [
  { no: 1, judul: 'Baca panduan', teks: 'Unduh panduan dan siapkan syarat berkas.' },
  { no: 2, judul: 'Siapkan dokumen', teks: 'Scan dokumen asli yang telah ditandatangani atasan.' },
  { no: 3, judul: 'Kirim daring', teks: 'Isi formulir dan unggah berkas. Tanpa biaya.' },
];

const TICKER = [
  'Dimanapun',
  'Pengajuan Online 24 Jam',
  'Gadget Apapun',
  'Pelayanan Terpadu Satu Pintu',
  'Bebas Biaya',
  'Online',
];

function cocokPeran(sasaran: LayananDetail['sasaran'], peran: Peran) {
  if (peran === 'Semua') return true;
  if (peran === 'Masyarakat') return sasaran === 'Seluruh Masyarakat';
  if (sasaran === 'Seluruh ASN') return true;
  return sasaran.includes(peran);
}

const formulirDitutup = (url?: string) => !!url && url.includes('closedform');

const IconCari = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
  </svg>
);
const IconBerkas = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconPanah = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m-6-6l6 6-6 6" />
  </svg>
);

/* CSS untuk teks berjalan (berhenti saat di-hover, mati jika pengguna
   memilih "kurangi animasi" di perangkatnya) */
const TICKER_CSS = `
  @keyframes simpel-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
  .simpel-ticker-track { display: flex; width: max-content; animation: simpel-ticker 35s linear infinite; }
  .simpel-ticker-wrap:hover .simpel-ticker-track { animation-play-state: paused; }
  @media (prefers-reduced-motion: reduce) { .simpel-ticker-track { animation: none; } }
`;

/* =========================================================
   HALAMAN
   ========================================================= */
export default function SIMPELSDMPage() {
  const [kata, setKata] = useState('');
  const [peran, setPeran] = useState<Peran>('Semua');
  const [kelompokAktif, setKelompokAktif] = useState<string>('Semua');

  const totalLayanan = useMemo(
    () => DATA_LAYANAN_KEMENAG.reduce((n, k) => n + k.layanan.length, 0),
    []
  );

  const hasil = useMemo(() => {
    const q = kata.trim().toLowerCase();
    return DATA_LAYANAN_KEMENAG
      .filter((k) => kelompokAktif === 'Semua' || k.huruf === kelompokAktif)
      .map((k) => ({
        ...k,
        layanan: k.layanan.filter(
          (l) =>
            cocokPeran(l.sasaran, peran) &&
            (!q ||
              l.nama.toLowerCase().includes(q) ||
              l.deskripsi.toLowerCase().includes(q) ||
              l.kodeLayanan.toLowerCase().includes(q))
        ),
      }))
      .filter((k) => k.layanan.length > 0);
  }, [kata, peran, kelompokAktif]);

  const jumlahHasil = hasil.reduce((n, k) => n + k.layanan.length, 0);

  /* chip di area gelap (hero) */
  const chipHero = (aktif: boolean) =>
    `px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#fdd847] ${
      aktif
        ? 'bg-[#fdd847] border-[#fdd847] text-slate-900'
        : 'bg-white/10 border-white/30 text-white hover:bg-white/20'
    }`;

  /* chip di area terang (tab kelompok) */
  const chip = (aktif: boolean) =>
    `px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6e66] ${
      aktif
        ? 'bg-[#0b6e66] border-[#0b6e66] text-white'
        : 'bg-white border-slate-300 text-slate-700 hover:border-[#0b6e66] hover:text-[#0b6e66] dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-teal-400 dark:hover:text-teal-300'
    }`;

  const tombolUtama =
    'bg-[#0b6e66] hover:bg-[#095a54] text-white dark:bg-teal-600 dark:hover:bg-teal-500';

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f3f3] dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-[#0b6e66] selection:text-white transition-colors duration-200">
      <style>{TICKER_CSS}</style>
      <Navbar />

      <div className="flex-1">
        {/* ============ HERO ============ */}
        <header className="relative overflow-hidden text-white bg-gradient-to-br from-[#4d7a87] via-[#3d6674] to-[#2d5260] dark:from-[#233f49] dark:via-[#1d3640] dark:to-[#162b33]">
          {/*
            OPSIONAL: untuk memakai foto latar seperti contoh, taruh gambar di
            /public/images/hero-simpel.jpg lalu aktifkan elemen di bawah ini.

            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{ backgroundImage: "url('/images/hero-simpel.jpg')" }}
            />
          */}

          {/* Hiasan: cincin besar seperti kaca pembesar pada contoh */}
          <div aria-hidden className="pointer-events-none absolute -left-28 -top-24 h-[26rem] w-[26rem] rounded-full border-[18px] border-slate-900/20" />
          <div aria-hidden className="pointer-events-none absolute -left-10 top-0 h-[18rem] w-[18rem] rounded-full bg-white/5" />
          <div aria-hidden className="pointer-events-none absolute -right-24 -bottom-32 h-80 w-80 rounded-full bg-black/10" />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm">
              SIMPEL SDM
            </h1>

            <p className="mt-3 text-sm sm:text-base font-semibold text-white/90 max-w-2xl mx-auto leading-relaxed">
              Sistem Pelayanan Informasi Manajemen Pelayanan Sumber Daya Manusia
            </p>

            <span className="mt-5 inline-block max-w-full px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium text-slate-900 bg-[#fde6dd] border border-[#f08a6b]">
              Layanan Kenaikan Pangkat, Pensiun, Cuti, Kinerja, dan Administrasi Kepegawaian
            </span>

            <p className="mt-4 text-xs sm:text-sm font-medium uppercase tracking-wide text-white/90">
              Subbagian Tata Usaha | Kementrian Agama Kota Parepare
            </p>

            {/* Pencarian */}
            <div className="mt-8 relative max-w-2xl mx-auto text-left">
              <span className="absolute inset-y-0 left-5 flex items-center text-slate-400 pointer-events-none">
                <IconCari />
              </span>
              <input
                type="search"
                value={kata}
                onChange={(e) => setKata(e.target.value)}
                placeholder="Cari layanan, mis. kenaikan pangkat, pensiun, cuti…"
                aria-label="Cari layanan"
                className="w-full py-3.5 pl-12 pr-5 rounded-full bg-white text-slate-900 border border-transparent text-base placeholder:text-slate-400 shadow-lg shadow-black/10 focus:outline-none focus:ring-4 focus:ring-[#fdd847]/50 transition"
              />
            </div>

            {/* Peran */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-white/80 mr-1">Saya adalah:</span>
              {DAFTAR_PERAN.map((p) => (
                <button
                  key={p.nilai}
                  type="button"
                  onClick={() => setPeran(p.nilai)}
                  aria-pressed={peran === p.nilai}
                  className={chipHero(peran === p.nilai)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* ============ PITA TEKS BERJALAN ============ */}
        <div
          className="simpel-ticker-wrap overflow-hidden bg-[#0b6e66] dark:bg-[#0a524c] text-white"
          role="marquee"
          aria-label="Keunggulan layanan"
        >
          <div className="simpel-ticker-track py-3.5">
            {[0, 1].map((salinan) => (
              <ul key={salinan} className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={salinan === 1}>
                {[...TICKER, ...TICKER].map((teks, i) => (
                  <li key={`${salinan}-${i}`} className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#fdd847]" />
                    {teks}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* ============ ALUR 3 LANGKAH ============ */}
        <section aria-label="Alur pengajuan" className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <ol className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 grid gap-4 sm:grid-cols-3">
            {LANGKAH.map((l) => (
              <li key={l.no} className="flex items-start gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full bg-[#fdd847] text-slate-900 text-sm font-bold flex items-center justify-center">
                  {l.no}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{l.judul}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">{l.teks}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ============ KATALOG ============ */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Tab kelompok */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Kelompok layanan">
              <button
                type="button"
                onClick={() => setKelompokAktif('Semua')}
                aria-pressed={kelompokAktif === 'Semua'}
                className={chip(kelompokAktif === 'Semua')}
              >
                Semua
              </button>
              {DATA_LAYANAN_KEMENAG.map((k) => (
                <button
                  key={k.huruf}
                  type="button"
                  onClick={() => setKelompokAktif(k.huruf)}
                  aria-pressed={kelompokAktif === k.huruf}
                  className={chip(kelompokAktif === k.huruf)}
                  title={k.judul}
                >
                  {k.huruf} · {k.judul.replace('Layanan ', '')}
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
              {jumlahHasil} dari {totalLayanan} layanan
            </p>
          </div>

          {/* Kosong */}
          {hasil.length === 0 && (
            <div className="text-center py-16 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Layanan tidak ditemukan</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Coba kata kunci lain, atau pilih "Semua" pada filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setKata('');
                  setPeran('Semua');
                  setKelompokAktif('Semua');
                }}
                className={`mt-4 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tombolUtama}`}
              >
                Reset pencarian
              </button>
            </div>
          )}

          {/* Daftar layanan */}
          {hasil.map((kelompok) => (
            <section key={kelompok.huruf} aria-labelledby={`kel-${kelompok.huruf}`}>
              <div className="mb-4">
                <h2 id={`kel-${kelompok.huruf}`} className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {kelompok.judul}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{kelompok.subjudul}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kelompok.layanan.map((item) => {
                  const ditutup = formulirDitutup(item.urlFormulir);
                  return (
                    <article
                      key={item.kodeLayanan}
                      className="flex flex-col justify-between rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0b6e66]/50 dark:hover:border-teal-500/50 hover:shadow-md transition"
                    >
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-teal-50 text-[#0b6e66] dark:bg-teal-900/40 dark:text-teal-300">
                            {item.kodeLayanan}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {item.sasaran}
                          </span>
                          {ditutup && (
                            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Formulir ditutup
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                          {item.nama}
                        </h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                          {item.deskripsi}
                        </p>
                      </div>

                      <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
                        {item.urlFormulir &&
                          (ditutup ? (
                            <span
                              aria-disabled
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                            >
                              Belum dibuka
                            </span>
                          ) : (
                            <a
                              href={item.urlFormulir}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={item.labelFormulir}
                              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0b6e66] transition-colors ${tombolUtama}`}
                            >
                              Ajukan <IconPanah />
                            </a>
                          ))}

                        <a
                          href={item.urlPanduan}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={item.labelPanduan}
                          className={
                            item.urlFormulir
                              ? 'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[#0b6e66] dark:text-teal-300 border border-[#0b6e66]/30 dark:border-teal-500/40 hover:bg-teal-50 dark:hover:bg-teal-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6e66] transition-colors'
                              : `flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0b6e66] transition-colors ${tombolUtama}`
                          }
                        >
                          <IconBerkas />
                          <span className="truncate">{item.urlFormulir ? 'Panduan' : item.labelPanduan}</span>
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          {/* ============ BANTUAN ============ */}
          <aside className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-[#fdd847] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">Butuh bantuan atau cek status usulan?</h4>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Berkas yang masuk diverifikasi secara berkala oleh Tim Analis Kepegawaian Subbagian Tata Usaha. Untuk kendala teknis atau usulan mendesak, hubungi Meja Layanan PTSP pada hari dinas (Senin–Jumat, 08.00–15.00 WITA).
              </p>
            </div>
            <Link
              href="/kontak"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-900 bg-[#fdd847] hover:bg-[#f3c928] transition-colors"
            >
              Hubungi Layanan <IconPanah />
            </Link>
          </aside>
        </main>
      </div>

      <Footer />
    </div>
  );
}