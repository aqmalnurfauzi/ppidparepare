'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ShieldAlert, Search, Eye, CheckCircle, XCircle, X, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getKeberatan, updateKeberatanStatus } from '@/lib/actions';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function KeberatanPage() {
  const [dataKeberatan, setDataKeberatan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tanggapan, setTanggapan] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const data = await getKeberatan();
      setDataKeberatan(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    let filtered = dataKeberatan;
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.id?.toString().includes(searchQuery) ||
        item.nama_pemohon?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    return filtered;
  }, [dataKeberatan, searchQuery, statusFilter]);

  const handleOpenDetail = (item: any) => {
    setSelectedItem(item);
    setTanggapan(item.tanggapan || '');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedItem) return;
    setIsSaving(true);
    const res = await updateKeberatanStatus(selectedItem.id, status, tanggapan);
    if (res.success) {
      setDataKeberatan(prev => prev.map(item => item.id === selectedItem.id ? { ...item, status, tanggapan } : item));
      setIsModalOpen(false);
      alert(`Status berhasil diubah menjadi ${status}`);
    } else {
      alert('Gagal mengubah status');
    }
    setIsSaving(false);
  };


  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'menunggu':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md text-xs font-bold">Menunggu</span>;
      case 'diproses':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md text-xs font-bold">Diproses</span>;
      case 'selesai':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md text-xs font-bold">Selesai</span>;
      case 'ditolak':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded-md text-xs font-bold">Ditolak</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Manajemen Keberatan</h1>
          <p className="text-slate-500 dark:text-slate-400">Tinjau dan kelola pengajuan keberatan dari pemohon informasi.</p>
        </div>
      </div>

      {/* Filter/Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari ID Keberatan atau Nama Pemohon..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          >
            <option value="">Semua Status</option>
            <option value="menunggu">Menunggu</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Data Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">ID Keberatan</th>
                <th className="px-6 py-4">Alasan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data keberatan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors cursor-pointer"
                    onClick={() => handleOpenDetail(item)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{item.id}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Ref: {item.tiket_referensi} • {item.nama_pemohon}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {item.alasan}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Lihat Detail">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Modal Detail & Tanggapan */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Detail Keberatan</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">ID Keberatan</p>
                  <p className="font-semibold">{selectedItem.id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tiket Referensi</p>
                  <p className="font-semibold">{selectedItem.tiket_referensi}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Nama Pemohon</p>
                  <p className="font-semibold">{selectedItem.nama_pemohon}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <div>{getStatusBadge(selectedItem.status)}</div>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">Alasan Keberatan</p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg mt-1">
                  {selectedItem.alasan}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-semibold mb-2">Tanggapan PPID</p>
                <textarea 
                  rows={4} 
                  placeholder="Ketik tanggapan resmi di sini..."
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900/50">
               <button 
                  onClick={() => handleUpdateStatus('diproses')}
                  disabled={isSaving || selectedItem.status === 'diproses'}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Tandai Diproses
                </button>
                <button 
                  onClick={() => handleUpdateStatus('ditolak')}
                  disabled={isSaving || selectedItem.status === 'ditolak'}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex gap-2 items-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <XCircle className="w-4 h-4"/>} Tolak
                </button>
                <button 
                  onClick={() => handleUpdateStatus('selesai')}
                  disabled={isSaving || selectedItem.status === 'selesai'}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex gap-2 items-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle className="w-4 h-4"/>} Selesai & Kirim Tanggapan
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
