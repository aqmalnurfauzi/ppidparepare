'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BarChart3, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getPermohonan } from '@/lib/actions';

export default function StatistikPage() {
  const [stats, setStats] = useState<any[]>([
    { label: 'Total Permohonan', value: '0', icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Permohonan Disetujui', value: '0', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Sedang Diproses', value: '0', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Permohonan Ditolak', value: '0', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  ]);
  const [monthlyData, setMonthlyData] = useState<any[]>([
    { month: 'Jan', value: 0 }, { month: 'Feb', value: 0 }, { month: 'Mar', value: 0 },
    { month: 'Apr', value: 0 }, { month: 'Mei', value: 0 }, { month: 'Jun', value: 0 },
    { month: 'Jul', value: 0 }, { month: 'Ags', value: 0 }, { month: 'Sep', value: 0 },
    { month: 'Okt', value: 0 }, { month: 'Nov', value: 0 }, { month: 'Des', value: 0 },
  ]);
  const [maxMonthly, setMaxMonthly] = useState<number>(100);

  useEffect(() => {
    async function loadData() {
      const data = await getPermohonan();
      
      const total = data.length;
      const approved = data.filter((d:any) => d.status.toLowerCase() === 'disetujui').length;
      const processing = data.filter((d:any) => ['pending', 'diproses'].includes(d.status.toLowerCase())).length;
      const rejected = data.filter((d:any) => d.status.toLowerCase() === 'ditolak').length;
      
      setStats([
        { label: 'Total Permohonan', value: total.toString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        { label: 'Permohonan Disetujui', value: approved.toString(), icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
        { label: 'Sedang Diproses', value: processing.toString(), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
        { label: 'Permohonan Ditolak', value: rejected.toString(), icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
      ]);

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
      const monthlyCounts = new Array(12).fill(0);
      data.forEach((d: any) => {
        if (d.tanggal) {
          const m = new Date(d.tanggal).getMonth();
          monthlyCounts[m]++;
        }
      });
      const highestCount = Math.max(...monthlyCounts, 10);
      setMaxMonthly(highestCount);
      setMonthlyData(months.map((m, i) => ({ month: m, value: monthlyCounts[i] })));
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-emerald-700 dark:bg-slate-900 bg-gradient-to-br from-emerald-800 to-emerald-600 dark:from-slate-900 dark:to-slate-950 text-white overflow-hidden transition-colors duration-500 py-16">
        <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Statistik Layanan</h2>
            <p className="text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Transparansi data capaian layanan informasi publik Kemenag Kota Parepare Tahun 2024.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        
        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.bg} ${stat.color}`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
                  <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{stat.value}</h3>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Charts / Visuals */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Monthly Bar Chart  */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tren Permohonan Bulanan</h3>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center flex-1 group">
                  <div 
                    className="w-full bg-emerald-100 dark:bg-emerald-900/30 group-hover:bg-emerald-400 dark:group-hover:bg-emerald-600 rounded-t-sm transition-all relative"
                    style={{ height: `${(data.value / maxMonthly) * 100}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1 px-2 rounded">
                      {data.value}
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 mt-2 rotate-45 sm:rotate-0 origin-left sm:origin-center">{data.month}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Kategori Info Terpopuler */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Kategori Populer</h3>
            <div className="space-y-6">
              {[
                { label: 'Informasi Berkala', percentage: 45, color: 'bg-blue-500' },
                { label: 'Informasi Serta Merta', percentage: 15, color: 'bg-rose-500' },
                { label: 'Informasi Setiap Saat', percentage: 35, color: 'bg-emerald-500' },
                { label: 'Informasi Dikecualikan', percentage: 5, color: 'bg-amber-500' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-500">{item.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
