'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface LayananKepegawaian {
  id: string;
  nama: string;
  kategori: string;
  deskripsi: string;
  linkPanduanDrive: string;
  linkGoogleForm: string;
  status: 'Buka' | 'Tutup';
}

const DAFTAR_LAYANAN: LayananKepegawaian[] = [
  {
    id: 'kp',
    nama: 'Usulan Kenaikan Pangkat (KP)',
    kategori: 'Kepangkatan & Gaji',
    deskripsi: 'Pengajuan berkas kenaikan pangkat reguler, pilihan struktural, dan jabatan fungsional periode BKN (Februari, April, Juni, Agustus, Oktober, Desember).',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-kp/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-kp-parepare',
    status: 'Buka'
  },
  {
    id: 'kgb',
    nama: 'Kenaikan Gaji Berkala (KGB)',
    kategori: 'Kepangkatan & Gaji',
    deskripsi: 'Pengusulan penetapan Surat Keputusan Kenaikan Gaji Berkala bagi ASN Kemenag setiap periode 2 tahunan.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-kgb/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-kgb-parepare',
    status: 'Buka'
  },
  {
    id: 'cuti',
    nama: 'Pengajuan Cuti Pegawai',
    kategori: 'Cuti & Disiplin',
    deskripsi: 'Permohonan Cuti Tahunan, Cuti Sakit, Cuti Alasan Penting, Cuti Melahirkan, dan Cuti Besar sesuai regulasi BKN.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-cuti/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-cuti-parepare',
    status: 'Buka'
  },
  {
    id: 'pensiun',
    nama: 'Usulan Pensiun (BUP / Janda Duda / APS)',
    kategori: 'Pemberhentian & Pensiun',
    deskripsi: 'Pengusulan berkas pemberhentian dengan hormat sebagai PNS karena Batas Usia Pensiun atau Atas Permintaan Sendiri.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-pensiun/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-pensiun-parepare',
    status: 'Buka'
  },
  {
    id: 'mutasi',
    nama: 'Usulan Mutasi & Pindah Tugas',
    kategori: 'Mutasi & Karir',
    deskripsi: 'Permohonan pindah tugas antar-satuan kerja internal Kemenag Parepare maupun antar-daerah / instansi luar.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-mutasi/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-mutasi-parepare',
    status: 'Buka'
  },
  {
    id: 'tubel-ibel',
    nama: 'Tugas Belajar & Izin Belajar',
    kategori: 'Pendidikan & Pelatihan',
    deskripsi: 'Pengajuan rekomendasi tugas belajar dan izin belajar jenjang S1, S2, maupun S3 bagi pegawai dan guru madrasah.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-ibel/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-ibel-parepare',
    status: 'Buka'
  },
  {
    id: 'gelar',
    nama: 'Pencantuman Gelar Akademik',
    kategori: 'Pendidikan & Pelatihan',
    deskripsi: 'Usulan pembaruan data dan pencantuman gelar kesarjanaan baru pada pangkalan data SIMPEG dan BKN.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-gelar/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-gelar-parepare',
    status: 'Buka'
  },
  {
    id: 'karpeg',
    nama: 'Penerbitan Karpeg, Karis, & Karsu',
    kategori: 'Administrasi Pegawai',
    deskripsi: 'Pengajuan pembuatan fisik Kartu Pegawai, Kartu Istri, dan Kartu Suami yang baru atau penggantian karena hilang.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-karpeg/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-karpeg-parepare',
    status: 'Buka'
  },
  {
    id: 'satya',
    nama: 'Usulan Satyalancana Karya Satya',
    kategori: 'Penghargaan',
    deskripsi: 'Usulan tanda kehormatan masa pengabdian ASN 10 tahun, 20 tahun, dan 30 tahun di Kementerian Agama.',
    linkPanduanDrive: 'https://drive.google.com/file/d/contoh-panduan-slks/view',
    linkGoogleForm: 'https://forms.gle/contoh-form-slks-parepare',
    status: 'Buka'
  }
];

const DAFTAR_KATEGORI = [
  'Semua',
  'Kepangkatan & Gaji',
  'Cuti & Disiplin',
  'Pemberhentian & Pensiun',
  'Mutasi & Karir',
  'Pendidikan & Pelatihan',
  'Administrasi Pegawai',
  'Penghargaan'
];

export default function LayananKepegawaianPage() {
  const [kataKunci, setKataKunci] = useState('');
  const [kategoriDipilih, setKategoriDipilih] = useState('Semua');

  const hasilFilter = DAFTAR_LAYANAN.filter((item) => {
    const cocokKata =
      item.nama.toLowerCase().includes(kataKunci.toLowerCase()) ||
      item.deskripsi.toLowerCase().includes(kataKunci.toLowerCase());
    const cocokKategori =
      kategoriDipilih === 'Semua' || item.kategori === kategoriDipilih;
    return cocokKata && cocokKategori;
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between">
      {/* 1. NAVBAR RESMI PORTAL PPID */}
      <Navbar />

      <div className="flex-1">
        {/* 2. HEADER HERO BANNER RESMI KEMENAG */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#005a2b] via-[#046a38] to-[#087037] text-white py-12 md:py-16 shadow-md">
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Jejak Navigasi (Breadcrumbs) */}
            <nav className="flex items-center gap-2 text-xs md:text-sm text-emerald-100/90 mb-4">
            </nav>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-400/30 text-emerald-100 text-xs font-medium mb-3 backdrop-blur-sm">
              <span>🏛️</span> SILAKAN - Sistem Informasi Layanan Kepegawaian
            </div>
            
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Layanan Pengajuan Usulan Kepegawaian
            </h1>
            
            <p className="mt-3 text-sm sm:text-base text-emerald-50 max-w-3xl leading-relaxed">
              Kantor Kementerian Agama Kota Parepare. Fasilitas pengajuan dokumen administrasi bagi seluruh ASN dan tenaga kependidikan secara terpadu, transparan, dan mudah.
            </p>
          </div>
        </section>

        {/* 3. KONTEN UTAMA: PENCARIAN & KARTU LAYANAN */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 space-y-4">
            <div>
              <input
                type="text"
                placeholder="Cari jenis usulan (misal: kenaikan pangkat, cuti, pensiun, dll)..."
                value={kataKunci}
                onChange={(e) => setKataKunci(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#005a2b] focus:border-transparent transition-all"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {DAFTAR_KATEGORI.map((kat) => (
                <button
                  key={kat}
                  onClick={() => setKategoriDipilih(kat)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    kategoriDipilih === kat
                      ? 'bg-[#005a2b] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {kat}
                </button>
              ))}
            </div>
          </div>

          {hasilFilter.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
              <p className="text-slate-500 text-sm font-medium">
                Tidak ditemukan layanan yang sesuai dengan kata kunci "{kataKunci}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hasilFilter.map((layanan) => (
                <div
                  key={layanan.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-[#005a2b] border border-emerald-100">
                        {layanan.kategori}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {layanan.status}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                      {layanan.nama}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {layanan.deskripsi}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <a
                      href={layanan.linkPanduanDrive}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-[#005a2b] bg-white border border-[#c2dac9] hover:bg-[#005a2b] hover:text-white transition-all shadow-sm"
                    >
                      <span>📄</span> Panduan (PDF)
                    </a>

                    <a
                      href={layanan.linkGoogleForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#005a2b] hover:bg-[#087037] transition-all shadow-sm"
                    >
                      <span>✍️</span> Ajukan Usulan
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Banner Bantuan Kepegawaian */}
          <div className="mt-12 bg-emerald-900 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
            <div>
              <h4 className="text-lg font-bold">Butuh Konsultasi Berkas Kepegawaian?</h4>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                Silakan hubungi Pengelola Kepegawaian Subbagian Tata Usaha Kantor Kemenag Kota Parepare pada hari dan jam kerja dinas.
              </p>
            </div>
            <Link
              href="/kontak"
              className="px-5 py-2.5 rounded-xl bg-white text-[#005a2b] font-bold text-xs sm:text-sm hover:bg-emerald-50 transition-colors shadow"
            >
              Hubungi Petugas
            </Link>
          </div>
        </main>
      </div>

      {/* 4. FOOTER RESMI PORTAL PPID */}
      <Footer />
    </div>
  );
}