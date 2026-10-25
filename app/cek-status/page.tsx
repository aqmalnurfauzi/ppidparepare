'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Search, CheckCircle, Clock, FileText, AlertCircle, Download, ExternalLink, ShieldAlert, FileCheck, SearchCode } from 'lucide-react';
import { motion } from 'framer-motion';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function CekStatusForm() {
  const searchParams = useSearchParams();
  const queryTicket = searchParams.get('tiket')?.trim() || '';
  const [prevQueryTicket, setPrevQueryTicket] = useState(queryTicket);
  const [ticket, setTicket] = useState(queryTicket);

  if (queryTicket !== prevQueryTicket) {
    setPrevQueryTicket(queryTicket);
    setTicket(queryTicket);
  }

  const [emailOrToken, setEmailOrToken] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchResult(null);
    setIsSearched(false);
    setSearchError(null);
    
    try {
      const { cekStatusTiket } = await import('@/lib/actions');
      const res = await cekStatusTiket(ticket, emailOrToken);
      
      if (res.success && res.data) {
        setSearchResult(res);
        setIsSearched(true);
      } else {
        setSearchError(res.error || 'Nomor registrasi atau kode rahasia pelacakan tidak sesuai.');
      }
    } catch (error) {
      console.error(error);
      setSearchError('Terjadi kesalahan sistem saat memeriksa berkas. Silakan coba beberapa saat lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Form Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-10 mb-8"
      >
        <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400">
            <SearchCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Lacak Permohonan & Unduh Jawaban</h3>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Gunakan Nomor Registrasi Permohonan atau Email yang terdaftar, ditambah Kode Rahasia Pelacakan (Token Akses).
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Nomor Registrasi atau Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="Contoh: PPID-2026-00001 atau nama@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nomor registrasi dari tanda terima pendaftaran atau alamat email pemohon.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Kode Rahasia Pelacakan (Token Akses) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={emailOrToken}
                  onChange={(e) => setEmailOrToken(e.target.value)}
                  placeholder="Masukkan kode rahasia dari tanda terima"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-sm font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Kode keamanan unik yang Anda terima pada layar bukti saat pendaftaran berhasil.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Akses Aman:</span> Dokumen resmi dilindungi enkripsi identitas pemohon.
            </div>
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memeriksa Berkas...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Lacak Berkas</span>
                </>
              )}
            </button>
          </div>
        </form>

        {searchError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm text-rose-800 dark:text-rose-200">
              <p className="font-bold">Permohonan Tidak Ditemukan atau Akses Ditolak</p>
              <p className="mt-0.5">{searchError}</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Results Section */}
      {isSearched && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
        >
          <div className="bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Status Saat Ini</p>
              <div className="flex items-center gap-2">
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  searchResult?.data?.status === 'selesai' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' :
                  searchResult?.data?.status === 'ditolak' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800' :
                  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                }`}>
                  <Clock className="w-3.5 h-3.5" /> {searchResult?.data?.status?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Tanggal Pengajuan</p>
              <p className="font-mono text-sm md:text-base font-bold text-slate-800 dark:text-white">{searchResult?.data?.tanggal}</p>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Informasi Tiket ({searchResult?.type === 'permohonan' ? 'Permohonan' : 'Keberatan'})</h3>
            
            <div className="mb-8 p-5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">Nama Pemohon (Tersamar)</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{searchResult?.data?.nama_pemohon_masked}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">{searchResult?.type === 'permohonan' ? 'Informasi yang Diminta' : 'Alasan Keberatan'}</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{searchResult?.data?.kebutuhan}</p>
                </div>
              </div>
              
              {searchResult?.data?.tanggapan && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tanggapan PPID</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">{searchResult?.data?.tanggapan}</p>
                </div>
              )}

              {searchResult?.data?.decision && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Keputusan PPID</p>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300 capitalize">
                    {String(searchResult.data.decision).replace(/_/g, ' ')}
                  </span>
                  {searchResult?.data?.alasan_penolakan && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-800 dark:text-rose-200 mt-1">
                      <strong>Alasan:</strong> {searchResult.data.alasan_penolakan}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Official Response Document Card (Dokumen Jawaban) */}
            {searchResult?.data?.dokumen_jawaban && searchResult.data.dokumen_jawaban.length > 0 && (
              <div className="mb-8 p-6 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-3xl shadow-xs">
                <div className="flex items-center gap-2.5 mb-2 text-emerald-800 dark:text-emerald-300">
                  <FileCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-bold text-sm md:text-base">Dokumen Jawaban & Berkas Laporan Resmi PPID</h4>
                </div>
                <p className="text-xs md:text-sm text-emerald-700 dark:text-emerald-400 mb-5 leading-relaxed">
                  Tim PPID telah menerbitkan berkas resmi untuk permohonan informasi Anda. Silakan unduh dokumen jawaban di bawah ini:
                </p>
                <div className="space-y-3">
                  {searchResult.data.dokumen_jawaban.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                            {doc.nama_dokumen}
                          </p>
                          {doc.file_size_bytes && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {formatBytes(doc.file_size_bytes)}
                            </p>
                          )}
                        </div>
                      </div>
                      <a
                        href={doc.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Unduh Berkas</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Riwayat Pemrosesan</h3>
            
            <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 space-y-8">
              
              <div className="relative">
                <div className={`absolute -left-[25px] w-12 h-12 rounded-full flex items-center justify-center ${searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <FileText className={`w-5 h-5 ${searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`} />
                </div>
                <div className="ml-10">
                  <h4 className={`font-bold ${searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'text-slate-800 dark:text-white' : 'text-slate-800 dark:text-slate-300 opacity-50'}`}>Selesai / Ditutup</h4>
                  <p className="text-sm text-slate-500 mt-1">{searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'Tahapan pemrosesan telah selesai.' : 'Menunggu tahapan pemrosesan selesai.'}</p>
                </div>
              </div>

              <div className="relative">
                <div className={`absolute -left-[25px] w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${searchResult?.data?.status === 'diproses' || searchResult?.data?.status === 'menunggu' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                  <Clock className={`w-5 h-5 ${searchResult?.data?.status === 'diproses' || searchResult?.data?.status === 'menunggu' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`} />
                </div>
                <div className="ml-10">
                  <h4 className="font-bold text-slate-800 dark:text-white">Sedang Diproses</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Permohonan Anda sedang ditinjau dan diproses oleh tim PPID.</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -left-[25px] bg-emerald-100 dark:bg-emerald-900/40 w-12 h-12 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="ml-10">
                  <h4 className="font-bold text-slate-800 dark:text-white">Permohonan Diterima</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistem telah menerima formulir permohonan Anda dengan nomor registrasi {searchResult?.data?.nomor_permohonan || ticket}.</p>
                  <p className="text-xs text-slate-400 mt-2">{searchResult?.data?.tanggal}</p>
                </div>
              </div>

            </div>

            {/* Objection Trigger Button */}
            {searchResult?.data?.status === 'selesai' && searchResult?.type === 'permohonan' && (
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">Tidak puas dengan tanggapan informasi?</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Anda dapat mengajukan keberatan resmi kepada Atasan PPID Kota Parepare.
                  </p>
                </div>
                <Link
                  href={`/pengajuan-keberatan?tiket=${searchResult.data.nomor_permohonan}&id=${searchResult.data.id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Ajukan Keberatan</span>
                </Link>
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Sesuai Undang-Undang KIP, waktu pemrosesan maksimal adalah 10 hari kerja sejak permohonan diterima, dengan kemungkinan perpanjangan waktu maksimal 7 hari kerja.
                </p>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </div>
  );
}

function CekStatusLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3"></div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    </div>
  );
}

export default function CekStatus() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-emerald-700 dark:bg-slate-900 bg-gradient-to-br from-emerald-800 to-emerald-600 dark:from-slate-900 dark:to-slate-950 text-white overflow-hidden transition-colors duration-500 py-16">
        <div 
          className="absolute inset-0 opacity-10 dark:opacity-5" 
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
        ></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-3">
              <SearchCode className="w-3.5 h-3.5" /> Portal Pelacakan Layanan Informasi
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Cek Status & Unduh Berkas</h2>
            <p className="text-base md:text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Pantau tahapan permohonan informasi publik dan unduh berkas laporan jawaban resmi PPID secara transparan.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-grow">
        <Suspense fallback={<CekStatusLoading />}>
          <CekStatusForm />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
