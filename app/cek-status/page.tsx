'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Search, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CekStatus() {
  const [ticket, setTicket] = useState('');
  const [email, setEmail] = useState('');
  const [isSearched, setIsSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [searchResult, setSearchResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSearchResult(null);
    setIsSearched(false);
    
    try {
      const { cekStatusTiket } = await import('@/lib/actions');
      const res = await cekStatusTiket(ticket);
      
      if (res.success && res.data) {
        // optionally verify email if required, but for now just showing data
        if (res.data.email?.toLowerCase() === email.toLowerCase() || res.data.email_pemohon?.toLowerCase() === email.toLowerCase() || res.data.email === undefined) {
          setSearchResult(res);
          setIsSearched(true);
        } else {
          alert('Email tidak sesuai dengan tiket');
        }
      } else {
        alert('Tiket tidak ditemukan');
      }
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat mencari tiket');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-4">Cek Status Permohonan</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Pantau sejauh mana proses permohonan informasi atau pengajuan keberatan Anda dengan memasukkan nomor tiket dan email yang terdaftar.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 mb-8">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nomor Tiket / Registrasi</label>
                <input 
                  type="text" 
                  value={ticket}
                  onChange={(e) => setTicket(e.target.value)}
                  placeholder="Contoh: REQ-2026-06-001"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Pemohon</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="flex items-end">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Cari Tiket
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Mock Results */}
          {isSearched && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Status saat ini</p>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${
                      searchResult?.data?.status === 'selesai' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                      searchResult?.data?.status === 'ditolak' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                    }`}>
                      <Clock className="w-4 h-4" /> {searchResult?.data?.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Tanggal Pengajuan</p>
                  <p className="font-medium text-slate-800 dark:text-white">{searchResult?.data?.tanggal}</p>
                </div>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Informasi Tiket ({searchResult?.type === 'permohonan' ? 'Permohonan' : 'Keberatan'})</h3>
                
                <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Nama Pemohon</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{searchResult?.data?.nama || searchResult?.data?.nama_pemohon}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{searchResult?.type === 'permohonan' ? 'Informasi yang Diminta' : 'Alasan Keberatan'}</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{searchResult?.data?.kebutuhan || searchResult?.data?.alasan}</p>
                    </div>
                  </div>
                  
                  {searchResult?.data?.tanggapan && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-slate-500 dark:text-slate-400">Tanggapan PPID</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">{searchResult?.data?.tanggapan}</p>
                    </div>
                  )}
                  {searchResult?.data?.catatan_internal && searchResult?.data?.status !== 'pending' && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-slate-500 dark:text-slate-400">Catatan Pemrosesan</p>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-1">{searchResult?.data?.catatan_internal}</p>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Riwayat Pemrosesan</h3>
                
                <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 space-y-8">
                  
                  <div className="relative">
                    <div className={`absolute -left-[25px] w-12 h-12 rounded-full flex items-center justify-center ${searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <FileText className={`w-5 h-5 ${searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'}`} />
                    </div>
                    <div className="ml-10">
                      <h4 className={`font-medium ${searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'text-slate-800 dark:text-white' : 'text-slate-800 dark:text-slate-300 opacity-50'}`}>Selesai / Ditutup</h4>
                      <p className="text-sm text-slate-500 mt-1">{searchResult?.data?.status === 'selesai' || searchResult?.data?.status === 'ditolak' ? 'Tahapan pemrosesan telah selesai.' : 'Menunggu tahapan pemrosesan selesai.'}</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className={`absolute -left-[25px] w-12 h-12 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 ${searchResult?.data?.status === 'diproses' || searchResult?.data?.status === 'menunggu' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                      <Clock className={`w-5 h-5 ${searchResult?.data?.status === 'diproses' || searchResult?.data?.status === 'menunggu' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'}`} />
                    </div>
                    <div className="ml-10">
                      <h4 className="font-medium text-slate-800 dark:text-white">Sedang Diproses</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Permohonan Anda sedang ditinjau dan diproses oleh tim PPID.</p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[25px] bg-emerald-100 dark:bg-emerald-900/40 w-12 h-12 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="ml-10">
                      <h4 className="font-medium text-slate-800 dark:text-white">Permohonan Diterima</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sistem telah menerima formulir permohonan Anda dengan nomor tiket {ticket}.</p>
                      <p className="text-xs text-slate-400 mt-2">{searchResult?.data?.tanggal}</p>
                    </div>
                  </div>

                </div>

                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-start gap-3 border border-blue-100 dark:border-blue-900/50">
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
      </main>

      <Footer />
    </div>
  );
}
