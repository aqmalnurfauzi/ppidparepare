'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Search, Filter, Eye, CheckCircle, Clock, XCircle, Loader2, ExternalLink, FileText, Download, MessageCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPermohonan, updatePermohonanStatus, updatePermohonanInternalNotes } from '@/lib/actions';
import { CardListSkeleton } from '@/components/ui/card-list-skeleton';

export default function ManajemenPermohonan() {
  const [selectedItem, setSelectedItem] = React.useState<any>(null);
  const [dataPermohonan, setDataPermohonan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Note state
  const [internalNote, setInternalNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    async function loadData() {
      const data = await getPermohonan();
      setDataPermohonan(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredData = React.useMemo(() => {
    let filtered = dataPermohonan;
    if (searchQuery) {
      filtered = filtered.filter(item => 
        (item.nama && item.nama.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.id && item.id.toString().includes(searchQuery))
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    return filtered;
  }, [dataPermohonan, searchQuery, statusFilter]);

  const handleOpenDetail = (item: any) => {
    setSelectedItem(item);
    setInternalNote(item.catatan_internal || '');
  };

  const handleSaveNote = async () => {
    if (!selectedItem) return;
    setIsSavingNote(true);
    const res = await updatePermohonanInternalNotes(selectedItem.id, internalNote);
    if (res.success) {
      setDataPermohonan(prev => prev.map(item => item.id === selectedItem.id ? { ...item, catatan_internal: internalNote } : item));
      setSelectedItem((prev: any) => prev ? { ...prev, catatan_internal: internalNote } : prev);
      alert('Catatan berhasil disimpan');
    } else {
      alert('Gagal menyimpan catatan. Pastikan kolom catatan_internal ada di database.');
    }
    setIsSavingNote(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const res = await updatePermohonanStatus(id, newStatus);
    if (res.success) {
      setDataPermohonan(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      setSelectedItem((prev: any) => prev ? { ...prev, status: newStatus } : prev);
      alert(`Status berhasil diubah menjadi ${newStatus}`);
    } else {
      alert('Gagal mengubah status');
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'selesai':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-md text-xs font-bold"><CheckCircle className="w-3.5 h-3.5"/> Selesai</span>;
      case 'diproses':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-xs font-bold"><Clock className="w-3.5 h-3.5"/> Diproses</span>;
      case 'ditolak':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-md text-xs font-bold"><XCircle className="w-3.5 h-3.5"/> Ditolak</span>;
      case 'pending':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md text-xs font-bold"><Clock className="w-3.5 h-3.5"/> Menunggu</span>;
      default:
        return <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-900/30 text-slate-700 dark:text-slate-400 rounded-md text-xs font-bold"><Clock className="w-3.5 h-3.5"/> {status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Permohonan Masuk</h1>
          <p className="text-slate-500 dark:text-slate-400">Daftar permohonan informasi publik dari masyarakat.</p>
        </div>
      </div>

      {/* Filter/Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama pemohon atau nomor tiket..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          >
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* List / Cards */}
      <div className="space-y-4">
        {loading ? (
          <CardListSkeleton />
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400">Tidak ada data permohonan yang ditemukan.</p>
          </div>
        ) : (
          filteredData.map((item, index) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-500 dark:text-slate-400 shrink-0 mt-1 sm:mt-0">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{item.id}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{item.kebutuhan}</h3>
                  <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span><span className="font-medium text-slate-700 dark:text-slate-300">Oleh:</span> {item.nama}</span>
                    <span><span className="font-medium text-slate-700 dark:text-slate-300">Instansi:</span> {item.instansi}</span>
                    <span><span className="font-medium text-slate-700 dark:text-slate-300">Tanggal:</span> {new Date(item.tanggal).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full sm:w-auto mt-2 sm:mt-0">
                <button 
                  onClick={() => handleOpenDetail(item)}
                  className="w-full sm:w-auto flex justify-center items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 text-emerald-700 dark:emerald-400 rounded-xl font-semibold transition-colors border border-emerald-200/50 dark:border-emerald-800/50"
                >
                  <Eye className="w-4 h-4" />
                  <span>Detail</span>
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Detail Permohonan</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">ID: {selectedItem.id}</p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Nama Pemohon</p>
                  <p className="text-slate-900 dark:text-white font-bold">{selectedItem.nama || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">NIK / No. Identitas</p>
                  <p className="text-slate-800 dark:text-slate-200 font-mono text-sm">{selectedItem.nik || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Kategori Pemohon</p>
                  <p className="text-slate-800 dark:text-slate-200 font-medium capitalize">{selectedItem.kategori_pemohon?.replace('_', ' ') || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Instansi / Organisasi</p>
                  <p className="text-slate-800 dark:text-slate-200 font-medium">{selectedItem.instansi || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Kontak Pemohon</p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-medium mb-1.5">{selectedItem.telepon || '-'} • {selectedItem.email || '-'}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.telepon && (
                      <a
                        href={`https://wa.me/${selectedItem.telepon.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Halo Bapak/Ibu ${selectedItem.nama},\n\nKami dari Petugas PPID Kemenag Kota Parepare ingin mengonfirmasi permohonan informasi Anda (No. Tiket: ${selectedItem.id}).\n\n`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat WhatsApp</span>
                      </a>
                    )}
                    {selectedItem.email && (
                      <a
                        href={`mailto:${selectedItem.email}?subject=${encodeURIComponent(`[PPID Kemenag Parepare] Permohonan Informasi - ${selectedItem.id}`)}&body=${encodeURIComponent(`Yth. ${selectedItem.nama},\n\nMenindaklanjuti permohonan informasi publik Anda dengan Nomor Tiket: ${selectedItem.id}...\n\nSalam,\nPPID Kemenag Kota Parepare`)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-300 dark:border-slate-700"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Kirim Email</span>
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Tanggal Masuk & Status</p>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{new Date(selectedItem.tanggal).toLocaleDateString('id-ID')}</span>
                    {getStatusBadge(selectedItem.status)}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Alamat Lengkap</p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm">{selectedItem.alamat || '-'}</p>
                </div>
              </div>

              {/* Lampiran Kartu Identitas (KTP/Paspor) */}
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                <p className="text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Lampiran Kartu Identitas (KTP/Paspor)
                </p>
                {selectedItem.file_ktp_url ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
                    <div className="flex items-center gap-3">
                      {selectedItem.file_ktp_url.startsWith('data:image') || selectedItem.file_ktp_url.match(/\.(jpeg|jpg|png|webp)($|\?)/i) ? (
                        <a 
                          href={selectedItem.file_ktp_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-14 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 block shrink-0 hover:opacity-80 transition-opacity"
                        >
                          <img src={selectedItem.file_ktp_url} alt="KTP" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Berkas Identitas Pemohon</p>
                        <p className="text-xs text-slate-500">Klik tombol di samping untuk memeriksa dokumen</p>
                      </div>
                    </div>
                    <a
                      href={selectedItem.file_ktp_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Dokumen</span>
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Tidak ada berkas kartu identitas terlampir.</p>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Rincian Informasi yang Dibutuhkan</p>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{selectedItem.kebutuhan}</p>
                </div>
              </div>

              {selectedItem.tujuan_penggunaan && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-1">Tujuan Penggunaan Informasi</p>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{selectedItem.tujuan_penggunaan}</p>
                  </div>
                </div>
              )}

              {/* Internal Notes / Chat */}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-2">Tindak Lanjut & Catatan Internal</p>
                <div className="space-y-4">
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ketik catatan internal..." 
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" 
                    />
                    <button 
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
                    >
                      {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      <span>Simpan Catatan</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mb-3">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleUpdateStatus(selectedItem.id, 'diproses')}
                    disabled={selectedItem.status === 'diproses'}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tandai Sedang Diproses
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedItem.id, 'selesai')}
                    disabled={selectedItem.status === 'selesai'}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload & Tandai Selesai
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedItem.id, 'ditolak')}
                    disabled={selectedItem.status === 'ditolak'}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Tolak Permohonan
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
