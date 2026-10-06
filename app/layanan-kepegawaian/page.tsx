'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

interface LayananDetail {
  kodeLayanan: string;
  nama: string;
  sasaran: 'PNS' | 'PNS & PPPK' | 'Seluruh ASN';
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
        nama: 'Usul Pencantuman Gelar Akademik',
        sasaran: 'PNS',
        deskripsi: 'Pengajuan pengesahan dan pencatatan gelar akademik (S1, S2, S3) yang diperoleh setelah pengangkatan pertama sebagai PNS pada pangkalan data kepegawaian.',
        labelPanduan: 'Format Berkas & Syarat (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1ydTXRVenjneNpilA8lFvjFlXHW0SsXnk/view?usp=sharing',
        labelFormulir: 'Formulir Usul Gelar',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLScMi2dBJM1NjitjmZE0UUr0-bji2cEj59EwF-rfS_wnEZMxyQ/viewform'
      },
      {
        kodeLayanan: 'A.3',
        nama: 'Usul Pencantuman Gelar Profesi',
        sasaran: 'PNS',
        deskripsi: 'Pengusulan pencatatan gelar profesi resmi pendidik/fungsional (misal: Gr. / Guru Profesional) pada sistem informasi aparatur negara.',
        labelPanduan: 'SOP Dokumen Profesi (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1eWGlqYpaAkiBubL4LikmWEGtjgr9x5Am/view?usp=sharing',
        labelFormulir: 'Formulir Gelar Profesi',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLScWSY_OKbhM5H-oxqDmRJ3cQoGxRNB0eTMtP5XF1C_7bJgfTg/viewform?usp=dialog'
      },
      {
        kodeLayanan: 'A.4',
        nama: 'Usul Pensiun Pegawai Negeri Sipil',
        sasaran: 'PNS',
        deskripsi: 'Pengajuan resmi penetapan surat keputusan pemberhentian dengan hak pensiun (Batas Usia Pensiun/BUP, Janda/Duda, atau Atas Permintaan Sendiri).',
        labelPanduan: 'Checklist Berkas Pensiun (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1xCP0zc2PkjGUXyYEIiSjm5svPTvIxjjb/view?usp=sharing',
        labelFormulir: 'Formulir Usul Pensiun',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSdoyPJhZuMBsOlUVtmasfVpqj-NOI9TqK5n4YDyp9KFe-MwXw/viewform'
      },
      {
        kodeLayanan: 'A.5',
        nama: 'Usul Surat Keterangan Memiliki Ijazah (SKMI)',
        sasaran: 'PNS',
        deskripsi: 'Permohonan dokumen pengganti izin belajar bagi pegawai yang telah menyelesaikan pendidikan Strata-1 sebelum diangkat menjadi CPNS/PNS.',
        labelPanduan: 'Blanko & Ketentuan SKMI (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1cSiFDEayikiysmBdrFijnk-0at5IFfls/view?usp=sharing',
        labelFormulir: 'Formulir Usul SKMI',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSfYQM2Ds5rgKE_hmzzHAHB2pDnwN3I5Jdz-0CT37dkNruQYfg/viewform'
      },
      {
        kodeLayanan: 'A.6',
        nama: 'Usul Tugas Belajar & Izin Belajar',
        sasaran: 'PNS',
        deskripsi: 'Pengusulan rekomendasi studi dan izin resmi melanjutkan pendidikan formal bagi pegawai kantor dan guru madrasah di lingkungan Kemenag Parepare.',
        labelPanduan: 'Regulasi & Format Izin (PDF)',
        urlPanduan: 'https://drive.google.com/file/d/1uzJewOqNX7uU5brD_DlVVgZOzfAAgx6q/view?usp=sharing',
        labelFormulir: 'Formulir Izin Belajar',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLSfRegdEjQddNKQQker3t5dIcaQfsEMOCTHCFEtQaTJ68KeiIA/viewform?usp=sf_link'
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
        nama: 'Survei Kepuasan Layanan Kepegawaian (Triwulan IV)',
        sasaran: 'Seluruh ASN',
        deskripsi: 'Instrumen survei kepuasan internal aparatur untuk mengukur mutu, kecepatan, dan transparansi pelayanan kepegawaian Kantor Kemenag Kota Parepare.',
        labelPanduan: 'Informasi Penilaian SKM',
        urlPanduan: 'https://drive.google.com/file/d/info-skm-kemenag/view',
        labelFormulir: 'Kuesioner Survei SKM',
        urlFormulir: 'https://docs.google.com/forms/d/e/1FAIpQLScXi71sIsMtksj--TSOD9INHsLYOF9qJvnXxCQXE-jyMhUXyw/viewform?usp=header'
      },
      {
        kodeLayanan: 'C.4',
        nama: 'Format Permohonan Surat Cuti (PPPK & PNS)',
        sasaran: 'PNS & PPPK',
        deskripsi: 'Formulir resmi permohonan izin cuti (Tahunan, Sakit, Alasan Penting, Melahirkan, dan Besar) sesuai Peraturan BKN No. 24/2017 & No. 7/2021.',
        labelPanduan: 'Unduh Format Blanko Cuti (Google Drive)',
        urlPanduan: 'https://drive.google.com/drive/folders/1UAdx1xtEzcZTqmQjGynzlVS9VwOmM6If'
      }
    ]
  }
];

export default function LayananKepegawaianPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between selection:bg-[#005a2b] selection:text-white">
      <Navbar />

      <div className="flex-1">
        <header className="bg-gradient-to-r from-[#005a2b] via-[#046a38] to-[#077039] text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 border-b border-emerald-700/60 flex flex-wrap items-center justify-between text-xs text-emerald-100 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tracking-wider uppercase">
                Kementerian Agama Republik Indonesia
              </span>
              <span className="text-emerald-400">|</span>
              <span className="text-emerald-100">Kantor Kota Parepare</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-emerald-200">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-300"></span>
                Subbagian Tata Usaha
              </span>
              <span>Jam Layanan: 08.00 - 16.00 WITA</span>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider uppercase rounded-full bg-emerald-950/60 border border-emerald-400/40 text-emerald-200 mb-3 backdrop-blur-xs">
                  SILAKAN - Sistem Informasi Layanan Administrasi Kepegawaian
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  Katalog Layanan Administrasi Kepegawaian
                </h1>
                <p className="mt-3 text-sm text-emerald-50 max-w-3xl leading-relaxed">
                  Pintu pelayanan digital terpadu untuk pengusulan kenaikan pangkat, ijazah, perizinan cuti, pelaporan kinerja bulanan, dan administrasi aparatur sipil negara di lingkungan Kantor Kementerian Agama Kota Parepare.
                </p>
              </div>

              <div className="shrink-0 bg-white text-slate-800 border border-emerald-200 rounded-xl p-4 text-xs max-w-xs shadow-lg">
                <div className="font-bold text-[#005a2b] flex items-center gap-1.5 mb-1.5 text-[12px]">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Maklumat Pelayanan Publik
                </div>
                <p className="text-slate-600 leading-relaxed text-[11.5px]">
                  Seluruh pengurusan berkas kepegawaian dilaksanakan secara transparan dan <strong className="text-slate-900 font-semibold">Bebas Biaya (Rp0 / Tanpa Pungli)</strong>.
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
          {DATA_LAYANAN_KEMENAG.map((kelompok) => (
            <section key={kelompok.huruf} className="space-y-5">
              <div className="border-b-2 border-slate-200 pb-3 flex items-baseline justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded bg-[#005a2b] text-white flex items-center justify-center text-xs font-bold">
                      {kelompok.huruf}
                    </span>
                    {kelompok.judul}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 pl-9">
                    {kelompok.subjudul}
                  </p>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {kelompok.layanan.length} Layanan
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {kelompok.layanan.map((item) => (
                  <article
                    key={item.kodeLayanan}
                    className="bg-white rounded-lg border border-slate-200 shadow-sm hover:border-[#005a2b]/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.kodeLayanan}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full bg-slate-50">
                          Sasaran: {item.sasaran}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                        {item.nama}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed text-justify">
                        {item.deskripsi}
                      </p>
                    </div>

                    <div className={`p-3 bg-slate-50 border-t border-slate-100 ${item.urlFormulir ? 'grid grid-cols-2 gap-2' : 'flex'}`}>
                      <a
                        href={item.urlPanduan}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold ${
                          item.urlFormulir
                            ? 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                            : 'w-full text-white bg-[#005a2b] hover:bg-[#074723] shadow-xs'
                        } transition-colors text-center`}
                        title={item.labelPanduan}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="truncate">{item.labelPanduan}</span>
                      </a>

                      {item.urlFormulir && (
                        <a
                          href={item.urlFormulir}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold text-white bg-[#005a2b] hover:bg-[#074723] transition-colors shadow-2xs text-center"
                          title={item.labelFormulir}
                        >
                          <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className="truncate">{item.labelFormulir}</span>
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <div className="bg-white border-l-4 border-[#005a2b] border-y border-r border-slate-200 rounded-r-lg p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-[#005a2b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pusat Bantuan & Verifikasi Berkas Kepegawaian
              </h4>
              <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
                Berkas usulan yang masuk melalui formulir daring akan diverifikasi secara berkala oleh Tim Analis Kepegawaian Subbagian Tata Usaha Kantor Kemenag Kota Parepare. Untuk konfirmasi kendala teknis atau status usulan mendesak, silakan hubungi Meja Layanan PTSP Kemenag Parepare pada hari dinas (Senin - Jumat).
              </p>
            </div>
            <Link
              href="/kontak"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold tracking-wide transition-colors shrink-0"
            >
              Kontak Layanan
            </Link>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}