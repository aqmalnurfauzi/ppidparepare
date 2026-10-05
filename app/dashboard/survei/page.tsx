'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Award, 
  Search, 
  Eye, 
  Trash2, 
  X, 
  Loader2, 
  Star, 
  BarChart3, 
  MessageSquare, 
  UserCheck, 
  TrendingUp, 
  Calendar, 
  Mail, 
  Phone,
  Briefcase,
  GraduationCap,
  Layers
} from 'lucide-react';
import { getSurveiKepuasan, deleteSurveiKepuasan } from '@/lib/actions';
import { TableSkeleton } from '@/components/ui/table-skeleton';

const UNSUR_PELAYANAN = [
  { key: 'skor_persyaratan', label: '1. Persyaratan Pelayanan' },
  { key: 'skor_prosedur', label: '2. Kemudahan Prosedur' },
  { key: 'skor_waktu', label: '3. Kecepatan Waktu' },
  { key: 'skor_biaya', label: '4. Biaya / Tarif (Kesesuaian)' },
  { key: 'skor_produk', label: '5. Produk Spesifikasi Layanan' },
  { key: 'skor_kompetensi', label: '6. Kompetensi Petugas' },
  { key: 'skor_perilaku', label: '7. Perilaku / Kesopanan Petugas' },
  { key: 'skor_penanganan', label: '8. Kualitas Penanganan Aduan' },
  { key: 'skor_sarana', label: '9. Sarana dan Prasarana' }
];

export default function SurveiKepuasanAdminPage() {
  const [dataSurvei, setDataSurvei] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab & Filter
  const [activeTab, setActiveTab] = useState<'responden' | 'saran'>('responden');
  const [searchQuery, setSearchQuery] = useState('');
  const [layananFilter, setLayananFilter] = useState('');

  // Modal Detail
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getSurveiKepuasan();
    setDataSurvei(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Perhitungan IKM (Indeks Kepuasan Masyarakat) berdasarkan PermenPAN-RB No 14/2017
  const ikmStats = useMemo(() => {
    const total = dataSurvei.length;
    if (total === 0) {
      return {
        total: 0,
        ikmKonversi: 0,
        mutu: 'N/A',
        kategori: 'Belum ada responden',
        unsurAverages: UNSUR_PELAYANAN.map(u => ({ ...u, avg: 0 }))
      };
    }

    const unsurAverages = UNSUR_PELAYANAN.map(u => {
      const sum = dataSurvei.reduce((acc, curr) => acc + (Number(curr[u.key]) || 0), 0);
      const avg = Number((sum / total).toFixed(2));
      return { ...u, avg };
    });

    const totalAvgUnsur = unsurAverages.reduce((acc, curr) => acc + curr.avg, 0) / UNSUR_PELAYANAN.length;
    // Nilai IKM Konversi = Rata-rata unsur * 25 (Skala 25 - 100)
    const ikmKonversi = Number((totalAvgUnsur * 25).toFixed(2));

    let mutu = 'D';
    let kategori = 'Tidak Baik';
    if (ikmKonversi >= 88.31) {
      mutu = 'A';
      kategori = 'Sangat Baik';
    } else if (ikmKonversi >= 76.61) {
      mutu = 'B';
      kategori = 'Baik';
    } else if (ikmKonversi >= 65.00) {
      mutu = 'C';
      kategori = 'Kurang Baik';
    }

    return {
      total,
      ikmKonversi,
      mutu,
      kategori,
      unsurAverages
    };
  }, [dataSurvei]);

  const filteredData = useMemo(() => {
    let filtered = dataSurvei;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.nama?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.jenis_layanan?.toLowerCase().includes(q) ||
        item.kritik_saran?.toLowerCase().includes(q)
      );
    }
    if (layananFilter) {
      filtered = filtered.filter(item => item.jenis_layanan === layananFilter);
    }
    return filtered;
  }, [dataSurvei, searchQuery, layananFilter]);

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data survei ini?')) return;
    setIsDeleting(id);
    const res = await deleteSurveiKepuasan(id);
    if (res.success) {
      setDataSurvei(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) {
        setIsModalOpen(false);
      }
    } else {
      alert('Gagal menghapus data survei');
    }
    setIsDeleting(null);
  };

  const getScoreColor = (score: number) => {
    if (score >= 3.5) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
    if (score >= 3) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';
    if (score >= 2) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800';
  };

  const getScoreBadgeText = (val: number) => {
    switch (val) {
      case 4: return 'Sangat Baik (4)';
      case 3: return 'Baik (3)';
      case 2: return 'Kurang Baik (2)';
      case 1: return 'Tidak Baik (1)';
      default: return `${val}`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Award className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            Survei Kepuasan Masyarakat (SKM)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Pengukuran Indeks Kepuasan Masyarakat (IKM) PPID sesuai standar PermenPAN-RB No. 14 Tahun 2017.
          </p>
        </div>
      </div>

      {/* Ringkasan Skor IKM */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Nilai IKM Utama */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Nilai IKM Konversi</span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-extrabold">
                Mutu: {ikmStats.mutu}
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black">{ikmStats.ikmKonversi}</span>
              <span className="text-emerald-200 text-sm font-semibold">/ 100</span>
            </div>
            <p className="mt-2 text-sm text-emerald-100 font-medium">
              Kinerja Pelayanan: <strong className="text-white underline">{ikmStats.kategori}</strong>
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-emerald-500/40 flex items-center justify-between text-xs text-emerald-100 relative z-10">
            <span>Total Responden: <strong>{ikmStats.total} orang</strong></span>
            <span>PermenPAN-RB 14/2017</span>
          </div>
          <Award className="w-48 h-48 text-white/5 absolute -right-6 -bottom-6 pointer-events-none" />
        </div>

        {/* Card Rata-rata 9 Unsur */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Rata-Rata 9 Unsur Pelayanan (Skala 1 - 4)
              </h3>
              <span className="text-xs text-slate-400">Target Ideal: 4.00</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ikmStats.unsurAverages.map((unsur) => (
                <div key={unsur.key} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate" title={unsur.label}>
                    {unsur.label}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">{unsur.avg}</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(unsur.avg)}`}>
                      {unsur.avg >= 3.5 ? 'Sangat Baik' : unsur.avg >= 3 ? 'Baik' : unsur.avg >= 2 ? 'Cukup' : 'Kurang'}
                    </span>
                  </div>
                  {/* Progress bar mini */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${(unsur.avg / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Nav Tabs & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-200/60 dark:bg-slate-800/80 rounded-2xl">
          <button
            onClick={() => setActiveTab('responden')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'responden'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Daftar Responden ({filteredData.length})
          </button>
          <button
            onClick={() => setActiveTab('saran')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'saran'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Kritik & Saran Responden
          </button>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari responden atau saran..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <select 
            value={layananFilter} 
            onChange={(e) => setLayananFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Layanan</option>
            <option value="Permohonan Informasi Publik">Permohonan Informasi Publik</option>
            <option value="Pengajuan Keberatan Informasi">Pengajuan Keberatan Informasi</option>
            <option value="Konsultasi & Layanan Informasi Langsung">Konsultasi / Langsung</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
      </div>

      {/* Tab Konten: Tabel Responden */}
      {activeTab === 'responden' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : filteredData.length === 0 ? (
            <div className="text-center py-16 px-4">
              <UserCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Belum ada data responden survei</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Setiap hasil survei yang diisi oleh masyarakat akan otomatis tercatat dan dihitung nilainya di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">No / Tgl</th>
                    <th className="px-6 py-4">Responden</th>
                    <th className="px-6 py-4">Layanan Dinilai</th>
                    <th className="px-6 py-4 text-center">Rata-Rata Skor</th>
                    <th className="px-6 py-4">Kritik / Saran</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredData.map((item) => {
                    const totalScore = UNSUR_PELAYANAN.reduce((acc, u) => acc + (Number(item[u.key]) || 0), 0);
                    const avgScore = Number((totalScore / UNSUR_PELAYANAN.length).toFixed(2));

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">#{item.id}</div>
                          <div className="text-xs text-slate-400">{item.tanggal || '-'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{item.nama || 'Anonim'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.email || '-'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.pekerjaan && <span>{item.pekerjaan} • </span>}
                            {item.pendidikan}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {item.jenis_layanan || 'Layanan PPID'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1 font-black text-sm text-slate-900 dark:text-white">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            {avgScore} <span className="text-xs text-slate-400 font-normal">/ 4</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                            {item.kritik_saran ? `"${item.kritik_saran}"` : '-'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                              title="Lihat Detail Nilai 9 Unsur"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting === item.id}
                              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Hapus Data"
                            >
                              {isDeleting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Konten: Kritik & Saran Responden */}
      {activeTab === 'saran' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.filter(d => Boolean(d.kritik_saran?.trim())).length === 0 ? (
            <div className="col-span-full text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Belum ada kritik & saran</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Kritik dan saran perbaikan dari masyarakat akan muncul pada kartu di bawah ini.
              </p>
            </div>
          ) : (
            filteredData
              .filter(d => Boolean(d.kritik_saran?.trim()))
              .map((item) => (
                <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-400">#{item.id} • {item.tanggal}</span>
                      <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold rounded-full border border-emerald-200 dark:border-emerald-800">
                        {item.jenis_layanan}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-200 font-medium italic leading-relaxed">
                      "{item.kritik_saran}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-900 dark:text-white">{item.nama || 'Anonim'}</span>
                    <button
                      onClick={() => { setSelectedItem(item); setIsModalOpen(true); }}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                    >
                      Detail Nilai
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Modal Detail Jawaban 9 Unsur */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Hasil Survei Responden #{selectedItem.id}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedItem.tanggal} • Layanan: {selectedItem.jenis_layanan}</p>
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
              {/* Profil Responden */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Nama Responden</span>
                  <strong className="text-slate-900 dark:text-white text-sm">{selectedItem.nama || 'Anonim'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Email / Kontak</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedItem.email || selectedItem.telepon || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Pekerjaan</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedItem.pekerjaan || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Pendidikan Terakhir</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedItem.pendidikan || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium">Jenis Layanan Dinilai</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{selectedItem.jenis_layanan}</span>
                </div>
              </div>

              {/* Rincian 9 Unsur */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Nilai Jawaban 9 Unsur SKM (PermenPAN-RB 14/2017)
                </h4>
                <div className="space-y-2">
                  {UNSUR_PELAYANAN.map((u) => {
                    const val = Number(selectedItem[u.key]) || 0;
                    return (
                      <div key={u.key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{u.label}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getScoreColor(val)}`}>
                          {getScoreBadgeText(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Kritik & Saran */}
              {selectedItem.kritik_saran && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Kritik & Saran Perbaikan
                  </h4>
                  <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-slate-800 dark:text-slate-200 text-xs italic leading-relaxed">
                    "{selectedItem.kritik_saran}"
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
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
