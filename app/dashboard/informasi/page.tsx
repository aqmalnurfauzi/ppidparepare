'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Search, Edit, Trash2, X, Save, Loader2, AlertCircle, Upload, CheckCircle, FileCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { getInformasiPublik, createInformasiPublik, updateInformasiPublik, deleteInformasiPublik } from '@/lib/actions';
import { uploadToSupabaseStorage } from '@/lib/storage';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function InformasiPage() {
  const [dataInformasiPublik, setDataInformasiPublik] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'>('add');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Upload Doc State
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadNote, setDocUploadNote] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    judul: '',
    kategori: 'Berkala',
    deskripsi: '',
    tahun: new Date().getFullYear().toString(),
    link_download: '',
    tipe_file: 'PDF',
    ukuran: '1.0 MB',
    status: 'Aktif'
  });

  const loadData = async () => {
    setLoading(true);
    const data = await getInformasiPublik();
    setDataInformasiPublik(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    let filtered = dataInformasiPublik;
    if (searchQuery) {
      filtered = filtered.filter(item => item.judul.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (kategoriFilter) {
      filtered = filtered.filter(item => 
        (item.kategori || '').toLowerCase().replace(/[\s-]/g, '') === kategoriFilter.toLowerCase().replace(/[\s-]/g, '')
      );
    }
    return filtered;
  }, [dataInformasiPublik, searchQuery, kategoriFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      const res = await deleteInformasiPublik(id);
      if (res.success) {
        setDataInformasiPublik(prev => prev.filter(item => item.id !== id));
      } else {
        alert('Gagal menghapus dokumen.');
      }
    }
  };

  const handleOpenModal = (mode: 'add'|'edit', item: any = null) => {
    setModalMode(mode);
    setDocUploadNote(null);
    if (mode === 'edit' && item) {
      setSelectedItem(item);
      setFormData({
        judul: item.judul || '',
        kategori: item.kategori || 'Berkala',
        deskripsi: item.deskripsi || '',
        tahun: item.tahun?.toString() || new Date().getFullYear().toString(),
        link_download: item.link_download || '',
        tipe_file: item.tipe_file || 'PDF',
        ukuran: item.ukuran || '1.0 MB',
        status: item.status || 'Aktif'
      });
    } else {
      setSelectedItem(null);
      setFormData({
        judul: '',
        kategori: 'Berkala',
        deskripsi: '',
        tahun: new Date().getFullYear().toString(),
        link_download: '',
        tipe_file: 'PDF',
        ukuran: '1.0 MB',
        status: 'Aktif'
      });
    }
    setIsModalOpen(true);
  };

  const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert('Ukuran file maksimal 25 MB.');
      return;
    }

    setIsUploadingDoc(true);
    setDocUploadNote(null);

    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeString = `${sizeInMb} MB`;

    setFormData(prev => ({
      ...prev,
      tipe_file: ext,
      ukuran: sizeString
    }));

    const res = await uploadToSupabaseStorage(file, 'dokumen');
    if (res.url) {
      setFormData(prev => ({ ...prev, link_download: res.url! }));
      setDocUploadNote(`File ${file.name} (${sizeString}) berhasil diunggah.`);
    } else {
      setDocUploadNote(`Info: ${res.error}. Anda tetap dapat menyimpan dokumen ini atau memasukkan URL manual.`);
    }
    setIsUploadingDoc(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim()) {
      alert('Judul dokumen tidak boleh kosong.');
      return;
    }
    setIsSaving(true);
    
    const docId = modalMode === 'add' ? `INF-${Date.now().toString().slice(-6)}` : selectedItem.id;
    const dataToSave = {
      id: docId,
      judul: formData.judul,
      kategori: formData.kategori,
      deskripsi: formData.deskripsi,
      tahun: parseInt(formData.tahun) || new Date().getFullYear(),
      link_download: formData.link_download || '#',
      tipe_file: formData.tipe_file || 'PDF',
      ukuran: formData.ukuran || '1.0 MB',
      status: formData.status,
      tanggal_update: new Date().toISOString()
    };

    if (modalMode === 'add') {
      const res = await createInformasiPublik(dataToSave);
      if (res.success) {
        await loadData();
        setIsModalOpen(false);
      } else {
        alert('Gagal menambah dokumen: ' + (res.error || 'Pastikan query SQL telah dijalankan di database.'));
      }
    } else {
      const res = await updateInformasiPublik(selectedItem.id, dataToSave);
      if (res.success) {
        await loadData();
        setIsModalOpen(false);
      } else {
        alert('Gagal mengubah dokumen: ' + (res.error || 'Pastikan query SQL telah dijalankan di database.'));
      }
    }
    setIsSaving(false);
  };


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Manajemen Informasi</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola daftar dokumen dan informasi publik PPID Kemenag Parepare.</p>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Dokumen</span>
        </button>
      </div>

      {/* Filter/Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari judul dokumen..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="flex-1 sm:w-auto px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          >
            <option value="">Semua Kategori</option>
            <option value="Berkala">Berkala</option>
            <option value="Setiap Saat">Setiap Saat</option>
            <option value="Serta Merta">Serta Merta</option>
            <option value="Dikecualikan">Dikecualikan</option>
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
                <th className="px-6 py-4">Judul Informasi</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Tahun</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                      <p>Tidak ada dokumen yang ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white whitespace-normal line-clamp-2">{item.judul}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Dibuat pada {new Date(item.tanggal_update).toLocaleDateString('id-ID')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium">
                        {item.kategori.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {item.tahun || '2024'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${item.status === 'Aktif' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                        {item.status || 'Aktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal('edit', item)}
                          className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {modalMode === 'add' ? 'Tambah Dokumen' : 'Edit Dokumen'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <form id="docForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Judul Dokumen</label>
                  <input 
                    type="text" 
                    required
                    value={formData.judul}
                    onChange={(e) => setFormData({...formData, judul: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                    <select 
                      value={formData.kategori}
                      onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                    >
                      <option value="Berkala">Berkala</option>
                      <option value="Setiap Saat">Setiap Saat</option>
                      <option value="Serta Merta">Serta Merta</option>
                      <option value="Dikecualikan">Dikecualikan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tahun</label>
                    <input 
                      type="number" 
                      required
                      min="2000"
                      max="2099"
                      value={formData.tahun}
                      onChange={(e) => setFormData({...formData, tahun: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status Dokumen</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Arsip">Arsip</option>
                  </select>
                </div>

                {/* Upload File Dokumen */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Berkas / File Dokumen (PDF, Word, Excel)
                  </label>
                  
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                    {isUploadingDoc ? (
                      <div className="flex flex-col items-center gap-2 py-3">
                        <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                        <p className="text-xs text-slate-500 font-medium">Mengunggah berkas dokumen...</p>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                            Pilih file dokumen dari perangkat
                          </span>
                          <p className="text-xs text-slate-400 mt-0.5">Format PDF, DOCX, XLSX (Maksimal 25 MB)</p>
                        </div>
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" 
                          onChange={handleDocFileChange}
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>

                  {docUploadNote && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> {docUploadNote}
                    </p>
                  )}

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      URL Link Download (Otomatis terisi saat upload, atau isi tautan eksternal seperti Google Drive):
                    </label>
                    <input 
                      type="text" 
                      value={formData.link_download}
                      onChange={(e) => setFormData({...formData, link_download: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deskripsi Ringkas</label>
                  <textarea 
                    rows={3}
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                  ></textarea>
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit"
                form="docForm"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Menyimpan...' : 'Simpan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
