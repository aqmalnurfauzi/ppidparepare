'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, Search, Edit, Trash2, Eye, X, Save, Loader2, 
  Upload, CheckCircle, Bold, Italic, List, Sparkles, FileText
} from 'lucide-react';
import { getBerita, createBerita, updateBerita, deleteBerita } from '@/lib/actions';
import { uploadToSupabaseStorage } from '@/lib/storage';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { RenderFormattedContent } from '@/components/RenderFormattedContent';

export default function ManajemenBerita() {
  const [beritaData, setBeritaData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'>('add');
  const [selectedBerita, setSelectedBerita] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Upload Image State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    status: 'Published',
    image_url: '',
    views: 0
  });

  const loadData = async () => {
    setLoading(true);
    const data = await getBerita();
    setBeritaData(data.map((b:any) => ({
      ...b,
      status: b.status || 'Published', 
      views: b.views || 0
    })));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtering Logic
  const filteredData = useMemo(() => {
    let filtered = beritaData;
    
    if (searchQuery) {
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (statusFilter !== 'Semua Status') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    return filtered;
  }, [beritaData, searchQuery, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus berita ini?')) {
      const res = await deleteBerita(id);
      if (res.success) {
        setBeritaData(prev => prev.filter(b => b.id !== id));
      } else {
        alert('Gagal menghapus berita.');
      }
    }
  };

  const handleOpenModal = (mode: 'add'|'edit', item: any = null) => {
    setModalMode(mode);
    setUploadNote(null);
    setActiveTab('write');
    if (mode === 'edit' && item) {
      setSelectedBerita(item);
      setFormData({
        title: item.title || '',
        summary: item.summary || '',
        content: item.content || '',
        status: item.status || 'Published',
        image_url: item.imageUrl || '',
        views: typeof item.views === 'number' ? item.views : (parseInt(item.views, 10) || 0)
      });
    } else {
      setSelectedBerita(null);
      setFormData({
        title: '',
        summary: '',
        content: '',
        status: 'Published',
        image_url: '',
        views: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran gambar maksimal 10 MB.');
      return;
    }

    setIsUploadingImage(true);
    setUploadNote('Mengompresi dan mengunggah gambar...');

    try {
      const res = await uploadToSupabaseStorage(file, 'berita');
      if (res.url) {
        setFormData(prev => ({ ...prev, image_url: res.url! }));
        if (res.isBase64Fallback) {
          setUploadNote('Gambar berhasil dioptimalkan dan siap disimpan.');
        } else {
          setUploadNote('Gambar berhasil diunggah ke cloud storage.');
        }
      } else {
        alert('Gagal mengunggah gambar: ' + (res.error || 'Terjadi kesalahan'));
        setUploadNote(null);
      }
    } catch (err: any) {
      alert('Gagal memproses file gambar: ' + (err.message || 'Error'));
      setUploadNote(null);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '', placeholder: string = '') => {
    const textarea = document.getElementById('beritaContentTextarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end) || placeholder;

    const replacement = `${prefix}${selected}${suffix}`;
    const newContent = text.substring(0, start) + replacement + text.substring(end);

    setFormData(prev => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 50);
  };

  const cleanHtmlTags = () => {
    if (!formData.content) return;
    const cleaned = formData.content
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    setFormData(prev => ({ ...prev, content: cleaned }));
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || `berita-${Date.now()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Judul berita tidak boleh kosong.');
      return;
    }
    if (!formData.content.trim()) {
      alert('Isi berita tidak boleh kosong.');
      return;
    }

    setIsSaving(true);

    // Normalisasi isi berita jika mengandung tag <p> manual
    let cleanContent = formData.content.trim();
    if (cleanContent.includes('<p>') || cleanContent.includes('</p>')) {
      cleanContent = cleanContent
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*[\/]?>/gi, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Auto-generate ringkasan jika kosong dari paragraf pertama
    let cleanSummary = formData.summary.trim();
    if (!cleanSummary) {
      const firstLine = cleanContent.split('\n')[0] || cleanContent;
      cleanSummary = firstLine.slice(0, 180).trim();
      if (firstLine.length > 180) cleanSummary += '...';
    }
    
    const dataToSave = {
      title: formData.title.trim(),
      summary: cleanSummary,
      content: cleanContent,
      status: formData.status,
      image_url: formData.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800',
      slug: selectedBerita?.slug || generateSlug(formData.title),
      tanggal: selectedBerita?.date || new Date().toISOString(),
      views: parseInt(String(formData.views), 10) || 0
    };

    if (modalMode === 'add') {
      const res = await createBerita(dataToSave);
      if (res.success) {
        await loadData();
        setIsModalOpen(false);
      } else {
        alert('Gagal menambah berita: ' + (res.error || 'Periksa koneksi database.'));
      }
    } else {
      const res = await updateBerita(selectedBerita.id, {
        ...dataToSave,
        tanggal: selectedBerita.date || new Date().toISOString()
      });
      if (res.success) {
        await loadData();
        setIsModalOpen(false);
      } else {
        alert('Gagal mengubah berita: ' + (res.error || 'Periksa koneksi database.'));
      }
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Manajemen Berita & Artikel</h1>
          <p className="text-slate-500 dark:text-slate-400">Kelola publikasi berita, pengumuman, dan artikel untuk halaman publik.</p>
        </div>
        <button 
          onClick={() => handleOpenModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> 
          <span>Tambah Berita</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Cari judul berita..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 dark:text-white"
            />
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 outline-none dark:text-white"
            >
              <option value="Semua Status">Semua Status</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton />
          ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm">
                <th className="px-6 py-4 font-medium">Judul Berita</th>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-center">Views</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Tidak ada berita ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white max-w-md truncate">
                      <div className="flex items-center gap-3">
                        <img 
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=800'} 
                          alt="" 
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                        />
                        <span className="truncate">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'Published' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' 
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{item.views || 0}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal('edit', item)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                          title="Edit Berita"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Hapus Berita"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>Menampilkan {paginatedData.length} dari {filteredData.length} berita</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-medium">
              {currentPage}
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                {modalMode === 'add' ? 'Tambah Berita Baru' : 'Edit Berita'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <form id="beritaForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Judul Berita <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Rakor Zakat Wakaf Sulsel, Kemenag Parepare Siap..."
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white text-sm"
                  />
                </div>

                {/* Upload Gambar Berita */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Foto Utama Berita
                  </label>
                  
                  {formData.image_url ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 flex flex-col sm:flex-row items-center gap-4">
                      <img 
                        src={formData.image_url} 
                        alt="Preview Gambar" 
                        className="w-full sm:w-44 h-28 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                      />
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Foto terpasang
                        </p>
                        {uploadNote && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{uploadNote}</p>
                        )}
                        <div className="flex gap-2 justify-center sm:justify-start">
                          <label className="cursor-pointer px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                            Ganti Foto
                            <input 
                              type="file" 
                              accept="image/png, image/jpeg, image/jpg, image/webp" 
                              onChange={handleImageFileChange}
                              className="hidden" 
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => { setFormData(prev => ({ ...prev, image_url: '' })); setUploadNote(null); }}
                            className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                      {isUploadingImage ? (
                        <div className="flex flex-col items-center gap-2 py-3">
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Mengompresi dan mengunggah gambar...</p>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                              Klik untuk pilih foto dari perangkat
                            </span>
                            <p className="text-xs text-slate-400 mt-1">Format JPG, PNG, WEBP (Otomatis dikompresi agar hemat memori)</p>
                          </div>
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/jpg, image/webp" 
                            onChange={handleImageFileChange}
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {/* Input Alternatif URL */}
                  <div className="mt-2">
                    <input 
                      type="url" 
                      value={formData.image_url}
                      onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                      placeholder="Atau tempel URL foto langsung di sini: https://..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Status Publikasi</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white text-sm"
                    >
                      <option value="Published">Published (Tayang Langsung)</option>
                      <option value="Draft">Draft (Simpan Sementara)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Pembaca / Views
                    </label>
                    <input 
                      type="number"
                      min="0"
                      value={formData.views}
                      onChange={(e) => setFormData({...formData, views: Math.max(0, parseInt(e.target.value, 10) || 0)})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Ringkasan Singkat <span className="text-xs font-normal text-slate-400">(Opsional)</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="Otomatis diambil jika dikosongkan"
                      value={formData.summary}
                      onChange={(e) => setFormData({...formData, summary: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white text-sm"
                    />
                  </div>
                </div>

                {/* Editor Isi Berita */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Isi Berita Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => setActiveTab('write')}
                        className={`px-3 py-1 rounded-md transition-all ${activeTab === 'write' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Tulis
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('preview')}
                        className={`px-3 py-1 rounded-md transition-all ${activeTab === 'preview' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                      >
                        Pratinjau Tampilan
                      </button>
                    </div>
                  </div>

                  {/* Panduan Paragraf yang Jelas */}
                  <div className="mb-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-semibold">Format Paragraf Otomatis:</span> Cukup tekan <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-emerald-300 dark:border-emerald-700 font-mono text-[11px]">Enter</kbd> 2x untuk membuat paragraf baru seperti mengetik pesan biasa. <strong>TIDAK PERLU</strong> mengetik kode <code>&lt;p&gt;</code>!
                    </div>
                  </div>

                  {activeTab === 'write' ? (
                    <div className="space-y-2">
                      {/* Mini Toolbar */}
                      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <button
                          type="button"
                          onClick={() => insertFormatting('\n\n', '', 'Tulis paragraf baru di sini...')}
                          className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1"
                          title="Tambah Paragraf Baru"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" /> Paragraf Baru
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('**', '**', 'teks tebal')}
                          className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-bold transition-colors flex items-center gap-1"
                          title="Tebalkan Kata (Bold)"
                        >
                          <Bold className="w-3.5 h-3.5" /> Tebal
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('*', '*', 'teks miring')}
                          className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 italic transition-colors flex items-center gap-1"
                          title="Miringkan Kata (Italic)"
                        >
                          <Italic className="w-3.5 h-3.5" /> Miring
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormatting('\n- ', '', 'Poin informasi')}
                          className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-medium transition-colors flex items-center gap-1"
                          title="Daftar Poin"
                        >
                          <List className="w-3.5 h-3.5" /> Poin
                        </button>
                        {(formData.content.includes('<p>') || formData.content.includes('</p>')) && (
                          <button
                            type="button"
                            onClick={cleanHtmlTags}
                            className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 border border-amber-200 dark:border-amber-700 rounded-lg text-amber-700 dark:text-amber-300 font-medium transition-colors ml-auto flex items-center gap-1"
                            title="Otomatis bersihkan kode <p> menjadi paragraf rapi"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Bersihkan Kode &lt;p&gt;
                          </button>
                        )}
                      </div>

                      <textarea
                        id="beritaContentTextarea"
                        rows={8}
                        required
                        placeholder="Ketik berita seperti biasa... Cukup tekan Enter 2x untuk paragraf baru."
                        value={formData.content}
                        onChange={(e) => setFormData({...formData, content: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white leading-relaxed text-sm font-sans"
                      ></textarea>
                    </div>
                  ) : (
                    /* Pratinjau Tampilan Berita */
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950 max-h-72 overflow-y-auto">
                      {formData.content.trim() ? (
                        <RenderFormattedContent content={formData.content} className="text-sm" />
                      ) : (
                        <p className="text-xs text-slate-400 italic">Belum ada isi berita yang ditulis untuk dipratinjau.</p>
                      )}
                    </div>
                  )}
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors text-sm"
              >
                Batal
              </button>
              <button 
                type="submit"
                form="beritaForm"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-70 text-sm shadow-sm"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Berita'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
