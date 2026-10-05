'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Target, 
  Users, 
  ChevronRight,
  BookOpen,
  Award,
  Building,
  GraduationCap
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { getProfil } from '@/lib/actions';

export default function ProfilPage() {
  const [activeTab, setActiveTab] = useState<'sejarah' | 'visimisi' | 'struktur'>('sejarah');
  const [sejarahText, setSejarahText] = useState<string>('');
  const [visiText, setVisiText] = useState<string>('');
  const [sejarahKepala, setSejarahKepala] = useState<string[]>([]);
  const [misi, setMisi] = useState<string[]>([]);
  const [strukturOrganisasi, setStrukturOrganisasi] = useState<any[]>([]);
  const [strukturKUA, setStrukturKUA] = useState<any[]>([]);
  const [strukturMadrasah, setStrukturMadrasah] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const sej = await getProfil('sejarah');
      setSejarahText(typeof sej === 'string' && sej ? sej : 'Instansi Kementerian Agama yang pertama dibentuk di Kota Parepare adalah Kantor Urusan Agama Kabupaten Parepare, yang mewilayahi 5 (lima) kewedanan yaitu: Parepare, Barru, Pinrang, Sidenreng, dan Enrekang pada tanggal 16 Juni 1951. Hal ini merupakan peran besar dari seorang ulama besar, K.H. Abdul Rahman Ambo Dalle.');

      const vis = await getProfil('visi');
      setVisiText(typeof vis === 'string' && vis ? vis : 'Terwujudnya Masyarakat Kota Parepare yang Taat Beragama, Rukun, Cerdas dan Sejahtera Lahir Batin');

      const kepala = await getProfil('sejarah_kepala');
      setSejarahKepala(Array.isArray(kepala) ? kepala : []);

      const misiData = await getProfil('misi');
      setMisi(Array.isArray(misiData) ? misiData : []);
      
      const org = await getProfil('struktur_organisasi');
      setStrukturOrganisasi(Array.isArray(org) ? org.map((item:any) => ({...item, icon: Award})) : []);
      
      const kua = await getProfil('struktur_kua');
      setStrukturKUA(Array.isArray(kua) ? kua.map((item:any) => ({...item, icon: Building})) : []);
      
      const madrasah = await getProfil('struktur_madrasah');
      setStrukturMadrasah(Array.isArray(madrasah) ? madrasah.map((item:any) => ({...item, icon: GraduationCap})) : []);
      
      setLoading(false);
    }
    loadData();
  }, []);

  const tabs = [
    { id: 'sejarah', label: 'Sejarah Singkat', icon: History },
    { id: 'visimisi', label: 'Visi & Misi', icon: Target },
    { id: 'struktur', label: 'Struktur Organisasi', icon: Users },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-emerald-700 dark:bg-slate-900 bg-gradient-to-br from-emerald-800 to-emerald-600 dark:from-slate-900 dark:to-slate-950 text-white overflow-hidden transition-colors duration-500 py-16">
        <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Profil Instansi</h2>
            <p className="text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Mengenal lebih dekat Kementerian Agama Kota Parepare: Sejarah, Visi, Misi, dan Struktur Organisasi.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {activeTab === 'sejarah' && (
              <motion.div
                key="sejarah"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-500 mb-4 flex items-center gap-3">
                    <History className="w-8 h-8" />
                    Sejarah Singkat
                  </h3>
                  <div className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {sejarahText}
                  </div>
                </div>
                
                <div className="mt-10">
                  <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 border-b border-slate-200 dark:border-slate-800 pb-2">Daftar Kepala Kantor Kementerian Agama Kota Parepare</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sejarahKepala.map((nama, index) => (
                      <div key={index} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-sm">{nama}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'visimisi' && (
              <motion.div
                key="visimisi"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto space-y-12"
              >
                {/* Visi */}
                <div className="text-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-8 md:p-12 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 font-bold tracking-widest uppercase text-sm mb-6">
                    Visi
                  </span>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">
                    "{visiText}"
                  </h3>
                </div>

                {/* Misi */}
                <div>
                  <div className="flex items-center gap-3 mb-8">
                    <Target className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Misi</h3>
                  </div>
                  <div className="space-y-4">
                    {misi.map((text, index) => (
                      <div key={index} className="flex gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          {index + 1}
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 pt-2 font-medium leading-relaxed">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'struktur' && (
              <motion.div
                key="struktur"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="max-w-6xl mx-auto space-y-12"
              >
                <div className="text-center mb-10">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Struktur Organisasi</h3>
                  <p className="text-slate-500 dark:text-slate-400">Kementerian Agama Kota Parepare</p>
                </div>

                {/* Pejabat Utama */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {strukturOrganisasi.map((item, index) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={index} className={`flex items-start gap-4 p-5 rounded-2xl border ${index === 0 ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-transparent md:col-span-2' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 transition-colors'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${index === 0 ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                          <ItemIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${index === 0 ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-500'}`}>{item.jabatan}</p>
                          <h4 className={`text-lg font-extrabold mb-1 ${index === 0 ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{item.nama}</h4>
                          <p className={`text-sm font-medium ${index === 0 ? 'text-emerald-50' : 'text-slate-500 dark:text-slate-400'}`}>NIP. {item.nip}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* KUA */}
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <Building className="w-5 h-5 text-emerald-600" /> Kepala KUA
                    </h4>
                    <div className="space-y-4">
                      {strukturKUA.map((item, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.jabatan}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 mt-1">{item.nama}</span>
                          <span className="text-xs text-slate-500 mt-0.5">NIP. {item.nip}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Madrasah */}
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <GraduationCap className="w-5 h-5 text-emerald-600" /> Kepala Madrasah
                    </h4>
                    <div className="space-y-4">
                      {strukturMadrasah.map((item, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.jabatan}</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 mt-1">{item.nama}</span>
                          <span className="text-xs text-slate-500 mt-0.5">NIP. {item.nip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
