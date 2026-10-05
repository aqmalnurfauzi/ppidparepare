'use client';

import React, { useState } from 'react';
import { FileDown, Calendar, BarChart3, PieChart, Filter, Loader2 } from 'lucide-react';
import { getLaporanData, getPermohonan } from '@/lib/actions';
import { motion } from 'framer-motion';

export default function LaporanPage() {
  const [periode, setPeriode] = useState('tahunan');
  const [tahun, setTahun] = useState('2024');
  const [isExporting, setIsExporting] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsData, setStatsData] = useState({ 
    monthly: [] as number[], 
    categories: { perorangan: 0, kelompok: 0, badan_hukum: 0 } 
  });

  React.useEffect(() => {
    async function loadStats() {
      const data = await getPermohonan();
      const monthly = new Array(12).fill(0);
      let perorangan = 0; let kelompok = 0; let badan_hukum = 0;
      
      data.forEach(p => {
        if (p.tanggal) {
          const m = new Date(p.tanggal).getMonth();
          monthly[m]++;
        }
        if (p.kategori_pemohon === 'Perorangan') perorangan++;
        else if (p.kategori_pemohon === 'Kelompok') kelompok++;
        else badan_hukum++;
      });
      setStatsData({ monthly, categories: { perorangan, kelompok, badan_hukum } });
      setLoadingStats(false);
    }
    loadStats();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await getLaporanData(periode, tahun);
      
      if (data.length === 0) {
        alert('Tidak ada data untuk periode ini.');
        setIsExporting(false);
        return;
      }

      const csvContent = [
        ["ID", "Nama", "Instansi", "Tanggal", "Status", "Kebutuhan"],
        ...data.map(item => [
          item.id, 
          item.nama, 
          item.instansi, 
          item.tanggal, 
          item.status, 
          `"${item.kebutuhan?.replace(/"/g, '""') || ''}"`
        ])
      ].map(e => e.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `laporan_permohonan_${tahun}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Gagal mengunduh laporan');
    }
    setIsExporting(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Laporan Layanan</h1>
          <p className="text-slate-500 dark:text-slate-400">Buat, tinjau, dan unduh rekapitulasi laporan layanan informasi publik.</p>
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
          <FileDown className="w-6 h-6 text-emerald-500" /> Unduh Laporan (Export)
        </h3>
        
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Periode <span className="text-rose-500">*</span></label>
            <select 
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="tahunan">Tahunan</option>
              <option value="semester">Semester</option>
              <option value="bulanan">Bulanan</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tahun <span className="text-rose-500">*</span></label>
            <select 
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-1">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Format Format <span className="text-rose-500">*</span></label>
            <select className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
              <option value="pdf">PDF Dokumen</option>
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV Data</option>
            </select>
          </div>

          <div className="md:col-span-1 pt-4 md:pt-0">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-emerald-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />} 
              <span>Export Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Preview Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[300px]">
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" /> Grafik Tren Permohonan
          </h4>
          
          {loadingStats ? (
            <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>
          ) : (
            <div className="flex-1 flex items-end gap-2 h-48 mt-auto">
              {statsData.monthly.map((val, idx) => {
                const max = Math.max(...statsData.monthly, 10);
                const height = `${(val / max) * 100}%`;
                return (
                  <div key={idx} className="flex-1 flex flex-col justify-end group relative h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height }}
                      className="bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-500 dark:group-hover:bg-emerald-600 rounded-t-md transition-colors w-full relative"
                    >
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-2 py-0.5 rounded">{val}</span>
                    </motion.div>
                    <span className="text-[10px] text-center mt-2 text-slate-500 font-medium uppercase">{['J','F','M','A','M','J','J','A','S','O','N','D'][idx]}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col min-h-[300px]">
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-amber-500" /> Sebaran Kategori Pemohon
          </h4>
          
          {loadingStats ? (
             <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500"/></div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-6">
              {[
                { label: 'Perorangan', val: statsData.categories.perorangan, color: 'bg-emerald-500' },
                { label: 'Kelompok/Organisasi', val: statsData.categories.kelompok, color: 'bg-blue-500' },
                { label: 'Badan Hukum/Instansi', val: statsData.categories.badan_hukum, color: 'bg-amber-500' },
              ].map(item => {
                const total = statsData.categories.perorangan + statsData.categories.kelompok + statsData.categories.badan_hukum || 1;
                const pct = Math.round((item.val / total) * 100);
                return (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{item.val} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1 }}
                        className={`h-full ${item.color} rounded-full`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
