'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FileText, Clock, AlertCircle, Calendar, Download, Eye, Lock } from 'lucide-react';
import { getInformasiPublik } from '@/lib/actions';
import { defaultInformasiPublik } from '@/lib/data';

export default function InformasiPublikPage() {
  const [activeTab, setActiveTab] = useState<'berkala' | 'sertamerta' | 'setiapsaat' | 'dikecualikan'>('berkala');
  const [dipData, setDipData] = useState<{berkala: any[], sertamerta: any[], setiapsaat: any[], dikecualikan: any[]}>({
    berkala: defaultInformasiPublik.filter((d:any) => d.kategori === 'Berkala'),
    sertamerta: defaultInformasiPublik.filter((d:any) => d.kategori === 'Serta Merta'),
    setiapsaat: defaultInformasiPublik.filter((d:any) => d.kategori === 'Setiap Saat'),
    dikecualikan: defaultInformasiPublik.filter((d:any) => d.kategori === 'Dikecualikan')
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getInformasiPublik();
        if (data && data.length > 0) {
          setDipData({
            berkala: data.filter((d:any) => d.kategori === 'Berkala'),
            sertamerta: data.filter((d:any) => d.kategori === 'Serta Merta'),
            setiapsaat: data.filter((d:any) => d.kategori === 'Setiap Saat'),
            dikecualikan: data.filter((d:any) => d.kategori === 'Dikecualikan')
          });
        }
      } catch (err) {
        console.error("Failed to load informasi publik:", err);
      }
    }
    loadData();
  }, []);

  const tabs = [
    { id: 'berkala', label: 'Berkala', icon: Calendar, description: 'Informasi yang diperbarui secara rutin.' },
    { id: 'sertamerta', label: 'Serta Merta', icon: AlertCircle, description: 'Informasi yang dapat mengancam hajat hidup orang banyak.' },
    { id: 'setiapsaat', label: 'Setiap Saat', icon: Clock, description: 'Informasi yang tersedia setiap saat untuk publik.' },
    { id: 'dikecualikan', label: 'Dikecualikan', icon: Lock, description: 'Informasi rahasia yang tidak dapat diakses publik.' },
  ] as const;

  const [searchQuery, setSearchQuery] = useState('');

  const renderTable = (data: any[], isDikecualikan: boolean = false) => {
    const filteredData = data.filter(item => 
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.tahun.toString().includes(searchQuery)
    );

    if (filteredData.length === 0) {
      return (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          Tidak ada dokumen yang sesuai dengan pencarian Anda.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
              <th className="py-4 px-4 font-medium">No</th>
              <th className="py-4 px-4 font-medium">Judul Dokumen</th>
              <th className="py-4 px-4 font-medium hidden md:table-cell">Tahun</th>
              {isDikecualikan ? (
                <th className="py-4 px-4 font-medium">Dasar Pengecualian</th>
              ) : (
                <>
                  <th className="py-4 px-4 font-medium hidden sm:table-cell">Format</th>
                  <th className="py-4 px-4 font-medium text-right">Aksi</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredData.map((item, index) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <td className="py-4 px-4 text-slate-500 dark:text-slate-400">{index + 1}</td>
                <td className="py-4 px-4">
                  <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    {isDikecualikan ? <Lock className="w-4 h-4 text-rose-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
                    {item.judul}
                  </div>
                  {/* Mobile view metadata */}
                  <div className="md:hidden flex gap-2 mt-1 text-xs text-slate-500">
                    <span>{item.tahun}</span>
                    {!isDikecualikan && <span>• {item.tipe_file} ({item.ukuran})</span>}
                  </div>
                </td>
                <td className="py-4 px-4 text-slate-600 dark:text-slate-300 hidden md:table-cell">{item.tahun}</td>
                
                {isDikecualikan ? (
                  <td className="py-4 px-4 text-sm text-rose-600 dark:text-rose-400">{item.deskripsi}</td>
                ) : (
                  <>
                    <td className="py-4 px-4 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {item.tipe_file}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Lihat">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Unduh">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-emerald-700 dark:bg-slate-900 bg-gradient-to-br from-emerald-800 to-emerald-600 dark:from-slate-900 dark:to-slate-950 text-white overflow-hidden transition-colors duration-500 py-16">
        <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Daftar Informasi Publik</h2>
            <p className="text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Akses transparan ke berbagai dokumen publik yang dikelola oleh PPID Kementerian Agama Kota Parepare.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tabs Navigation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isDikecualikan = tab.id === 'dikecualikan';
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                className={`flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-2xl text-sm transition-all text-center ${
                  isActive 
                    ? isDikecualikan 
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-none'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                }`}
              >
                <Icon className={`w-8 h-8 mb-1 ${isActive ? 'text-white/90' : isDikecualikan ? 'text-rose-400' : 'text-emerald-500'}`} />
                <span className="font-bold">{tab.label}</span>
                <span className={`text-xs hidden sm:block px-2 ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                  {tab.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {activeTab === 'berkala' && <Calendar className="w-6 h-6 text-emerald-500" />}
                  {activeTab === 'sertamerta' && <AlertCircle className="w-6 h-6 text-emerald-500" />}
                  {activeTab === 'setiapsaat' && <Clock className="w-6 h-6 text-emerald-500" />}
                  {activeTab === 'dikecualikan' && <Lock className="w-6 h-6 text-rose-500" />}
                  Informasi {tabs.find(t => t.id === activeTab)?.label}
                </h3>
                
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari dokumen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {renderTable(dipData[activeTab], activeTab === 'dikecualikan')}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
