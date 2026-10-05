'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Eye, 
  Trash2, 
  X, 
  Loader2, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Send, 
  Mail, 
  Phone,
  HelpCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { getPartisipasiPublik, updatePartisipasiStatus, deletePartisipasiPublik } from '@/lib/actions';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function PartisipasiPage() {
  const [dataPartisipasi, setDataPartisipasi] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jenisFilter, setJenisFilter] = useState('');

  // Modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tanggapan, setTanggapan] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getPartisipasiPublik();
    setDataPartisipasi(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = dataPartisipasi.length;
    const menunggu = dataPartisipasi.filter(d => d.status === 'menunggu').length;
    const diproses = dataPartisipasi.filter(d => d.status === 'diproses').length;
    const selesai = dataPartisipasi.filter(d => d.status === 'selesai').length;
    return { total, menunggu, diproses, selesai };
  }, [dataPartisipasi]);

  const filteredData = useMemo(() => {
    let filtered = dataPartisipasi;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.nama?.toLowerCase().includes(q) ||
        item.judul?.toLowerCase().includes(q) ||
        item.pesan?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    if (jenisFilter) {
      filtered = filtered.filter(item => item.jenis?.toLowerCase() === jenisFilter.toLowerCase());
    }
    return filtered;
  }, [dataPartisipasi, searchQuery, statusFilter, jenisFilter]);

  const handleOpenDetail = (item: any) => {
    setSelectedItem(item);
    setTanggapan(item.tanggapan || '');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedItem) return;
    setIsSaving(true);
    const res = await updatePartisipasiStatus(selectedItem.id, status, tanggapan);
    if (res.success) {
      setDataPartisipasi(prev => prev.map(item => item.id === selectedItem.id ? { ...item, status, tanggapan } : item));
      setSelectedItem((prev: any) => ({ ...prev, status, tanggapan }));
      alert(`Status berhasil diperbarui menjadi ${status}`);
    } else {
      alert('Gagal mengubah status');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data partisipasi ini?')) return;
    setIsDeleting(id);
    const res = await deletePartisipasiPublik(id);
    if (res.success) {
      setDataPartisipasi(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) {
        setIsModalOpen(false);
      }
    } else {
      alert('Gagal menghapus data');
    }
    setIsDeleting(null);
  };

  const getJenisBadge = (jenis: string) => {
    switch (jenis?.toLowerCase()) {
      case 'kritik':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3 h-3" /> Kritik
          </span>
        );
      case 'saran':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Lightbulb className="w-3 h-3" /> Saran
          </span>
        );
      case 'aspirasi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <Send className="w-3 h-3" /> Aspirasi
          </span>
        );
      case 'pertanyaan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <HelpCircle className="w-3 h-3" /> Pertanyaan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {jenis || 'Umum'}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'menunggu':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 rounded-md text-xs font-bold">Menunggu</span>;
      case 'diproses':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 rounded-md text-xs font-bold">Diproses</span>;
      case 'selesai':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-md text-xs font-bold">Selesai</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-md text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            Partisipasi Publik
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Kelola aspirasi, saran, kritik, dan pertanyaan masyarakat untuk peningkatan pelayanan PPID.
          </p>
        </div>
      </div>

      {/* Statistik Ringkas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Masuk</span>
            <MessageSquare className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Menunggu</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{stats.menunggu}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-500">Diproses</span>
            <Loader2 className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">{stats.diproses}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Selesai</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.selesai}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama, judul, email, atau isi pesan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select 
            value={jenisFilter} 
            onChange={(e) => setJenisFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 md:flex-none"
          >
            <option value="">Semua Jenis</option>
            <option value="saran">Saran</option>
            <option value="kritik">Kritik</option>
            <option value="aspirasi">Aspirasi</option>
            <option value="pertanyaan">Pertanyaan</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 md:flex-none"
          >
            <option value="">Semua Status</option>
            <option value="menunggu">Menunggu</option>
            <option value="diproses">Diproses</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <TableSkeleton />
        ) : filteredData.length === 0 ? (
          <div className="text-center py-16 px-4">
            <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Belum ada data partisipasi publik</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Semua masukan, saran, kritik, atau aspirasi masyarakat melalui formulir publik akan tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">No / Tgl</th>
                  <th className="px-6 py-4">Pengirim</th>
                  <th className="px-6 py-4">Jenis</th>
                  <th className="px-6 py-4">Judul & Ringkasan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredData.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">#{item.id}</div>
                      <div className="text-xs text-slate-400">{item.tanggal || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white">{item.nama}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{item.email}</div>
                      {item.telepon && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{item.telepon}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getJenisBadge(item.jenis)}
                    </td>
                    <td className="px-6 py-4 max-w-xs md:max-w-md">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{item.judul}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{item.pesan}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                          title="Lihat Detail & Tindak Lanjut"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting === item.id}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          {isDeleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail & Tindak Lanjut */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Detail Partisipasi Publik #{selectedItem.id}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getJenisBadge(selectedItem.jenis)}
                    <span className="text-xs text-slate-400">• {selectedItem.tanggal}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Profil Pengirim & Hubungi */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-base">{selectedItem.nama}</div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {selectedItem.email}</span>
                      {selectedItem.telepon && (
                        <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {selectedItem.telepon}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedItem.telepon && (
                      <a
                        href={`https://wa.me/${selectedItem.telepon.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                    <a
                      href={`mailto:${selectedItem.email}?subject=Tanggapan PPID: ${encodeURIComponent(selectedItem.judul)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" /> Email
                    </a>
                  </div>
                </div>
              </div>

              {/* Isi Pesan */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Judul Masukan</h4>
                <div className="text-base font-bold text-slate-900 dark:text-white mb-4">
                  {selectedItem.judul}
                </div>

                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Isi Masukan / Pesan</h4>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedItem.pesan}
                </div>
              </div>

              {/* Tanggapan & Tindak Lanjut Admin */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Catatan Tanggapan / Tindak Lanjut PPID</span>
                  <span className="text-slate-400 font-normal normal-case">Internal & Disimpan</span>
                </label>
                <textarea 
                  rows={3}
                  value={tanggapan}
                  onChange={(e) => setTanggapan(e.target.value)}
                  placeholder="Tuliskan catatan tindak lanjut, disposisi, atau keterangan penyelesaian masukan ini..."
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Ubah Status:</span>
                <button
                  disabled={isSaving}
                  onClick={() => handleUpdateStatus('menunggu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedItem.status === 'menunggu' 
                      ? 'bg-amber-500 text-white shadow-sm' 
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100'
                  }`}
                >
                  Menunggu
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleUpdateStatus('diproses')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedItem.status === 'diproses' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100'
                  }`}
                >
                  Diproses
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleUpdateStatus('selesai')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedItem.status === 'selesai' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                  }`}
                >
                  Selesai
                </button>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
