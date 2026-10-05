'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Info, 
  CheckCircle, 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Building, 
  GraduationCap, 
  History, 
  Target, 
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  getKontenStatis, 
  updateKontenStatis, 
  getProfil, 
  updateProfil, 
  getFAQs, 
  addFaq, 
  updateFaq, 
  deleteFaq 
} from '@/lib/actions';

export default function ManajemenKontenStatis() {
  const [activeTab, setActiveTab] = useState<'profil-ppid' | 'visi-misi' | 'struktur-organisasi' | 'maklumat-layanan' | 'faq'>('profil-ppid');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // States for Profil PPID / Sejarah
  const [profilJudul, setProfilJudul] = useState('');
  const [profilIsi, setProfilIsi] = useState('');
  
  // States for Visi & Misi
  const [visi, setVisi] = useState('');
  const [misi, setMisi] = useState('');

  // States for Maklumat
  const [maklumat, setMaklumat] = useState('');

  // States for Struktur Organisasi
  const [activeStrukturSubTab, setActiveStrukturSubTab] = useState<'pejabat' | 'kua' | 'madrasah' | 'kepala-kantor'>('pejabat');
  const [pejabatList, setPejabatList] = useState<{ jabatan: string; nama: string; nip: string }[]>([]);
  const [kuaList, setKuaList] = useState<{ jabatan: string; nama: string; nip: string }[]>([]);
  const [madrasahList, setMadrasahList] = useState<{ jabatan: string; nama: string; nip: string }[]>([]);
  const [sejarahKepalaList, setSejarahKepalaList] = useState<string[]>([]);
  
  // FAQ state
  const [faqs, setFaqs] = useState<any[]>([]);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [faqForm, setFaqForm] = useState<{ id: number | null; question: string; answer: string }>({ id: null, question: '', answer: '' });
  const [isSavingFaq, setIsSavingFaq] = useState(false);

  useEffect(() => {
    async function fetchKonten() {
      setLoading(true);
      try {
        const profilData = await getKontenStatis('profil-ppid');
        if (profilData) {
          setProfilJudul(profilData.judul || '');
          setProfilIsi(profilData.isi || '');
        }

        const visiMisiData = await getKontenStatis('visi-misi');
        if (visiMisiData) {
          setVisi(visiMisiData.judul || '');
          setMisi(visiMisiData.isi || '');
        }

        const maklumatData = await getKontenStatis('maklumat-layanan');
        if (maklumatData) {
          setMaklumat(maklumatData.isi || '');
        }

        // Struktur Organisasi
        const orgData = await getProfil('struktur_organisasi');
        if (Array.isArray(orgData)) setPejabatList(orgData);

        const kuaData = await getProfil('struktur_kua');
        if (Array.isArray(kuaData)) setKuaList(kuaData);

        const madrasahData = await getProfil('struktur_madrasah');
        if (Array.isArray(madrasahData)) setMadrasahList(madrasahData);

        const kepalaData = await getProfil('sejarah_kepala');
        if (Array.isArray(kepalaData)) setSejarahKepalaList(kepalaData);

        // FAQs
        const faqsData = await getFAQs();
        setFaqs(faqsData);
      } catch (err) {
        console.error('Error fetching dashboard content:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchKonten();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    let success = false;

    try {
      if (activeTab === 'profil-ppid') {
        const res = await updateKontenStatis('profil-ppid', { judul: profilJudul, isi: profilIsi });
        success = res.success;
      } else if (activeTab === 'visi-misi') {
        const res = await updateKontenStatis('visi-misi', { judul: visi, isi: misi });
        success = res.success;
      } else if (activeTab === 'maklumat-layanan') {
        const res = await updateKontenStatis('maklumat-layanan', { judul: 'Maklumat Layanan', isi: maklumat });
        success = res.success;
      } else if (activeTab === 'struktur-organisasi') {
        // Simpan semua sub-bagian struktur ke profil_konten
        const res1 = await updateProfil('struktur_organisasi', pejabatList);
        const res2 = await updateProfil('struktur_kua', kuaList);
        const res3 = await updateProfil('struktur_madrasah', madrasahList);
        const res4 = await updateProfil('sejarah_kepala', sejarahKepalaList);
        success = res1.success && res2.success && res3.success && res4.success;
      }

      if (success) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3500);
      } else {
        alert('Gagal menyimpan perubahan. Pastikan script SQL pembaruan RLS telah dijalankan di database Supabase.');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Pejabat Utama
  const handleAddPejabat = () => {
    setPejabatList(prev => [...prev, { jabatan: '', nama: '', nip: '' }]);
  };
  const handleUpdatePejabat = (index: number, field: string, value: string) => {
    setPejabatList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };
  const handleDeletePejabat = (index: number) => {
    setPejabatList(prev => prev.filter((_, i) => i !== index));
  };

  // Handler KUA
  const handleAddKua = () => {
    setKuaList(prev => [...prev, { jabatan: 'KEPALA KUA KEC. ', nama: '', nip: '' }]);
  };
  const handleUpdateKua = (index: number, field: string, value: string) => {
    setKuaList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };
  const handleDeleteKua = (index: number) => {
    setKuaList(prev => prev.filter((_, i) => i !== index));
  };

  // Handler Madrasah
  const handleAddMadrasah = () => {
    setMadrasahList(prev => [...prev, { jabatan: 'KEPALA ', nama: '', nip: '' }]);
  };
  const handleUpdateMadrasah = (index: number, field: string, value: string) => {
    setMadrasahList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };
  const handleDeleteMadrasah = (index: number) => {
    setMadrasahList(prev => prev.filter((_, i) => i !== index));
  };

  // Handler Kepala Kantor dari Masa ke Masa
  const handleAddKepala = () => {
    setSejarahKepalaList(prev => [...prev, '']);
  };
  const handleUpdateKepala = (index: number, value: string) => {
    setSejarahKepalaList(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };
  const handleDeleteKepala = (index: number) => {
    setSejarahKepalaList(prev => prev.filter((_, i) => i !== index));
  };

  // FAQ Modal
  const handleOpenFaq = (faq?: any) => {
    if (faq) {
      setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer });
    } else {
      setFaqForm({ id: null, question: '', answer: '' });
    }
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = async () => {
    if (!faqForm.question || !faqForm.answer) return alert('Semua field harus diisi.');
    setIsSavingFaq(true);
    let res;
    if (faqForm.id) {
      res = await updateFaq(faqForm.id, { question: faqForm.question, answer: faqForm.answer });
    } else {
      res = await addFaq({ question: faqForm.question, answer: faqForm.answer });
    }

    if (res.success) {
      const updated = await getFAQs();
      setFaqs(updated);
      setIsFaqModalOpen(false);
    } else {
      alert('Gagal menyimpan FAQ. Pastikan query SQL database telah diperbarui.');
    }
    setIsSavingFaq(false);
  };

  const handleDeleteFaq = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus FAQ ini?')) return;
    const res = await deleteFaq(id);
    if (res.success) {
      setFaqs(prev => prev.filter(f => f.id !== id));
    }
  };

  const tabs = [
    { id: 'profil-ppid', label: 'Profil & Sejarah', icon: History },
    { id: 'visi-misi', label: 'Visi & Misi', icon: Target },
    { id: 'struktur-organisasi', label: 'Struktur Organisasi', icon: Users },
    { id: 'maklumat-layanan', label: 'Maklumat Layanan', icon: FileCheck },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Manajemen Konten Statis</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Kelola teks untuk Profil, Visi-Misi, Struktur Organisasi, Maklumat Layanan, dan FAQ.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all ${
                isActive
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 md:p-8">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
            <p className="text-sm text-slate-500">Memuat data konten...</p>
          </div>
        ) : (
          <>
            {/* 1. TAB PROFIL & SEJARAH */}
            {activeTab === 'profil-ppid' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex gap-3 text-sm border border-emerald-200 dark:border-emerald-900/50">
                  <Info className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p>
                    Konten ini akan langsung ditampilkan di halaman publik <strong>/profil</strong> pada tab <strong>Sejarah Singkat</strong>.
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Judul Halaman / Profil</label>
                  <input 
                    type="text" 
                    value={profilJudul} 
                    onChange={(e) => setProfilJudul(e.target.value)}
                    placeholder="Profil PPID Kemenag Kota Parepare" 
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Teks Sejarah Singkat Kemenag Kota Parepare
                  </label>
                  <textarea 
                    rows={8} 
                    value={profilIsi} 
                    onChange={(e) => setProfilIsi(e.target.value)}
                    placeholder="Tuliskan sejarah berdirinya Kemenag Kota Parepare..." 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-y text-base leading-relaxed"
                  ></textarea>
                </div>
              </motion.div>
            )}

            {/* 2. TAB VISI & MISI */}
            {activeTab === 'visi-misi' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex gap-3 text-sm border border-emerald-200 dark:border-emerald-900/50">
                  <Info className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p>
                    Konten ini akan langsung ditampilkan di halaman publik <strong>/profil</strong> pada tab <strong>Visi & Misi</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Teks Visi</label>
                  <textarea 
                    rows={3} 
                    value={visi} 
                    onChange={(e) => setVisi(e.target.value)}
                    placeholder="Terwujudnya Masyarakat Kota Parepare yang Taat Beragama, Rukun, Cerdas dan Sejahtera Lahir Batin" 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-y font-medium"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Butir-Butir Misi (Pisahkan setiap poin dengan baris baru)
                  </label>
                  <textarea 
                    rows={8} 
                    value={misi} 
                    onChange={(e) => setMisi(e.target.value)}
                    placeholder="1. Meningkatkan kualitas kesalehan umat beragama.&#10;2. Memperkuat kerukunan umat beragama...&#10;3. Meningkatkan layanan keagamaan yang adil..." 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-y leading-relaxed"
                  ></textarea>
                  <p className="text-xs text-slate-400 mt-1">Setiap baris baru akan otomatis ditampilkan sebagai satu butir kartu misi pada halaman profil.</p>
                </div>
              </motion.div>
            )}

            {/* 3. TAB STRUKTUR ORGANISASI (SOLUSI KHUSUS UNTUK PERMINTAAN USER) */}
            {activeTab === 'struktur-organisasi' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex gap-3 text-sm border border-emerald-200 dark:border-emerald-900/50">
                  <Info className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold">Kelola Struktur Organisasi Lengkap</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Ubah data pejabat struktural, Kepala KUA, Kepala Madrasah, dan Sejarah Kepala Kantor Kemenag. Data ini langsung tampil di halaman <strong>/profil</strong> pada tab <strong>Struktur Organisasi</strong>.
                    </p>
                  </div>
                </div>

                {/* Sub Tab Struktur */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveStrukturSubTab('pejabat')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeStrukturSubTab === 'pejabat'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> Pejabat Utama ({pejabatList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStrukturSubTab('kua')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeStrukturSubTab === 'kua'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" /> Kepala KUA ({kuaList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStrukturSubTab('madrasah')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeStrukturSubTab === 'madrasah'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5" /> Kepala Madrasah ({madrasahList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStrukturSubTab('kepala-kantor')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeStrukturSubTab === 'kepala-kantor'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" /> Kepala Kantor dari Masa ke Masa ({sejarahKepalaList.length})
                  </button>
                </div>

                {/* Sub Tab: Pejabat Utama */}
                {activeStrukturSubTab === 'pejabat' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        Daftar Pejabat Struktural Kemenag Parepare
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddPejabat}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Pejabat
                      </button>
                    </div>

                    <div className="space-y-3">
                      {pejabatList.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 items-start md:items-center">
                          <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jabatan</label>
                              <input
                                type="text"
                                value={item.jabatan}
                                onChange={e => handleUpdatePejabat(idx, 'jabatan', e.target.value)}
                                placeholder="Contoh: KEPALA KANTOR..."
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap & Gelar</label>
                              <input
                                type="text"
                                value={item.nama}
                                onChange={e => handleUpdatePejabat(idx, 'nama', e.target.value)}
                                placeholder="Contoh: Dr. H. FITRIADI, S.Ag., M.Ag"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NIP</label>
                              <input
                                type="text"
                                value={item.nip}
                                onChange={e => handleUpdatePejabat(idx, 'nip', e.target.value)}
                                placeholder="Contoh: 197510101999031002"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePejabat(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg self-end md:self-center transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Kepala KUA */}
                {activeStrukturSubTab === 'kua' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        Daftar Kepala KUA Kecamatan
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddKua}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah KUA
                      </button>
                    </div>

                    <div className="space-y-3">
                      {kuaList.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 items-start md:items-center">
                          <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Jabatan / Kecamatan</label>
                              <input
                                type="text"
                                value={item.jabatan}
                                onChange={e => handleUpdateKua(idx, 'jabatan', e.target.value)}
                                placeholder="Contoh: KEPALA KUA KEC. BACUKIKI"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Lengkap & Gelar</label>
                              <input
                                type="text"
                                value={item.nama}
                                onChange={e => handleUpdateKua(idx, 'nama', e.target.value)}
                                placeholder="Nama Kepala KUA"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NIP</label>
                              <input
                                type="text"
                                value={item.nip}
                                onChange={e => handleUpdateKua(idx, 'nip', e.target.value)}
                                placeholder="NIP"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteKua(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg self-end md:self-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Kepala Madrasah */}
                {activeStrukturSubTab === 'madrasah' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        Daftar Kepala Madrasah
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddMadrasah}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Madrasah
                      </button>
                    </div>

                    <div className="space-y-3">
                      {madrasahList.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 items-start md:items-center">
                          <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Madrasah</label>
                              <input
                                type="text"
                                value={item.jabatan}
                                onChange={e => handleUpdateMadrasah(idx, 'jabatan', e.target.value)}
                                placeholder="Contoh: KEPALA MAN 1 KOTA PAREPARE"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama Kepala Madrasah</label>
                              <input
                                type="text"
                                value={item.nama}
                                onChange={e => handleUpdateMadrasah(idx, 'nama', e.target.value)}
                                placeholder="Nama Kepala Madrasah"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">NIP</label>
                              <input
                                type="text"
                                value={item.nip}
                                onChange={e => handleUpdateMadrasah(idx, 'nip', e.target.value)}
                                placeholder="NIP"
                                className="w-full px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMadrasah(idx)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg self-end md:self-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: Kepala Kantor dari Masa ke Masa */}
                {activeStrukturSubTab === 'kepala-kantor' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                        Daftar Kepala Kantor Kemenag Kota Parepare dari Masa ke Masa
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddKepala}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Nama
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sejarahKepalaList.map((nama, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={nama}
                            onChange={e => handleUpdateKepala(idx, e.target.value)}
                            placeholder="Nama Kepala Kantor"
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteKepala(idx)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. TAB MAKLUMAT LAYANAN */}
            {activeTab === 'maklumat-layanan' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl flex gap-3 text-sm border border-emerald-200 dark:border-emerald-900/50">
                  <Info className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p>
                    Konten ini akan langsung ditampilkan di halaman publik <strong>/standar-layanan</strong> pada kotak <strong>Maklumat Pelayanan</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Isi Pernyataan Maklumat Pelayanan</label>
                  <textarea 
                    rows={6} 
                    value={maklumat} 
                    onChange={(e) => setMaklumat(e.target.value)}
                    placeholder="Kami Menyatakan Sanggup Menyelenggarakan Pelayanan Informasi Publik Sesuai Standar Layanan Yang Telah Ditetapkan..." 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-y leading-relaxed font-medium"
                  ></textarea>
                </div>
              </motion.div>
            )}

            {/* 5. TAB FAQ */}
            {activeTab === 'faq' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Kelola daftar Pertanyaan yang Sering Diajukan (FAQ).</p>
                  <button 
                    type="button"
                    onClick={() => handleOpenFaq()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Tambah FAQ
                  </button>
                </div>
                
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Pertanyaan</th>
                        <th className="px-4 py-3 font-semibold">Jawaban</th>
                        <th className="px-4 py-3 font-semibold w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {faqs.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">Belum ada FAQ.</td></tr>
                      ) : (
                        faqs.map(faq => (
                          <tr key={faq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 align-top">{faq.question}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 align-top max-w-sm line-clamp-3">{faq.answer}</td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleOpenFaq(faq)} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                                <button onClick={() => handleDeleteFaq(faq.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {isFaqModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{faqForm.id ? 'Edit FAQ' : 'Tambah FAQ Baru'}</h3>
                        <button onClick={() => setIsFaqModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pertanyaan</label>
                          <input 
                            type="text" 
                            value={faqForm.question} 
                            onChange={e => setFaqForm({...faqForm, question: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Jawaban</label>
                          <textarea 
                            rows={4} 
                            value={faqForm.answer} 
                            onChange={e => setFaqForm({...faqForm, answer: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" 
                          ></textarea>
                        </div>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                        <button onClick={() => setIsFaqModalOpen(false)} className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">Batal</button>
                        <button 
                          onClick={handleSaveFaq} 
                          disabled={isSavingFaq}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg flex items-center gap-2"
                        >
                          {isSavingFaq && <Loader2 className="w-4 h-4 animate-spin"/>}
                          Simpan FAQ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Tombol Simpan Bawah (Hanya untuk tab non-FAQ) */}
            {activeTab !== 'faq' && (
              <div className="mt-8 flex items-center justify-end gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                {isSaved && (
                  <span className="text-emerald-600 flex items-center gap-2 text-sm font-semibold animate-pulse">
                    <CheckCircle className="w-5 h-5 text-emerald-500" /> Perubahan berhasil disimpan!
                  </span>
                )}
                <button 
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-600/20 font-semibold disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                  <span>
                    {activeTab === 'struktur-organisasi' ? 'Simpan Struktur Organisasi' : 'Simpan Perubahan'}
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
