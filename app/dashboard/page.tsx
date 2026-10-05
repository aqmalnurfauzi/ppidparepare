'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2,
  Activity,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [loading, setLoading] = React.useState(true);
  const [dataInformasiPublik, setDataInformasiPublik] = React.useState<any[]>([]);
  const [statsData, setStatsData] = React.useState({ permohonan: 0, pengguna: 0, keberatanPending: 0, permohonanPending: 0, totalDocs: 0 });
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [greeting, setGreeting] = React.useState('');

  React.useEffect(() => {
    // Set Greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Selamat Pagi');
    else if (hour < 15) setGreeting('Selamat Siang');
    else if (hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');

    async function loadData() {
      // Panggil server actions statis (tanpa dynamic import) untuk dashboard agar tidak ada waterfall 
      const { getDashboardStats } = await import('@/lib/actions');
      const data = await getDashboardStats();
      
      setDataInformasiPublik(data.recentDocs);
      setStatsData(data.stats);
      setTasks(data.tasks || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = [
    { label: 'Total Dokumen', value: statsData.totalDocs.toString(), icon: FileText, trend: 'Sistem Terkini', color: 'from-blue-500 to-cyan-500', bgIcon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'Permohonan Masuk', value: statsData.permohonan.toString(), icon: MessageSquare, trend: 'Total permohonan', color: 'from-emerald-500 to-teal-500', bgIcon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Keberatan Masuk', value: statsData.keberatanPending.toString(), icon: AlertCircle, trend: 'Perlu ditinjau', color: 'from-red-500 to-rose-500', bgIcon: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    { label: 'Admin & Petugas', value: statsData.pengguna.toString(), icon: Users, trend: 'Sistem normal', color: 'from-amber-500 to-orange-500', bgIcon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Hero Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 sm:p-10 text-white shadow-xl shadow-emerald-900/20"
      >
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-20 -mb-10 w-48 h-48 bg-emerald-900/20 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
              {greeting}, Admin 👋
            </h1>
            <p className="text-emerald-50 max-w-xl text-lg">
              Pantau seluruh aktivitas permohonan informasi publik, dokumen, dan statistik sistem hari ini dalam satu layar.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl font-medium border border-white/30 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid with Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group relative overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/20 transition-all duration-300"
            >
              <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.color} rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity`}></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl ${stat.bgIcon} ring-1 ring-inset ring-slate-100 dark:ring-slate-800 transition-colors group-hover:bg-opacity-20`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <Activity className="w-3 h-3 mr-1.5" />
                  {stat.trend.split(' ')[0]}
                </span>
              </div>
              
              <div className="relative z-10">
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-1">{stat.label}</h3>
                {loading ? (
                  <div className="h-10 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mt-1"></div>
                ) : (
                  <p className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stat.value}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Col - Tasks (Wider) */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tugas & Aktivitas Tertunda</h3>
              </div>
              <Link href="/dashboard/permohonan" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1 group">
                Lihat Semua <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="p-6 flex-1 bg-slate-50/30 dark:bg-slate-950/20">
              <div className="space-y-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                     <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-pulse">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0"></div>
                        <div className="flex-1 space-y-3 py-1">
                          <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                          <div className="h-3 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                     </div>
                  ))
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <ShieldCheck className="w-12 h-12 text-emerald-400 mb-3 opacity-50" />
                    <p className="text-slate-500 font-medium">Luar biasa! Tidak ada tugas tertunda.</p>
                  </div>
                ) : (
                  tasks.map((task, i) => {
                    let link = '#';
                    let isWarning = task.tipe === 'warning';
                    if (isWarning) link = '/dashboard/keberatan';
                    else if (task.tipe === 'info') link = '/dashboard/permohonan';
                    
                    return (
                      <Link href={link} key={i} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:shadow-md transition-all group">
                        <div className={`w-12 h-12 rounded-full shrink-0 flex items-center justify-center ${isWarning ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                          {isWarning ? <AlertCircle className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">{task.judul}</h4>
                            <span className="text-xs text-slate-500 whitespace-nowrap ml-2 flex items-center gap-1"><Clock className="w-3 h-3"/>{new Date(task.created_at).toLocaleDateString('id-ID')}</span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{task.pesan}</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Col - Recent Docs & System Status */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          

          {/* Recent Docs */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800/60 shadow-sm overflow-hidden flex flex-col min-h-[300px]"
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-900 dark:text-white">Dokumen Terbaru</h3>
              <Link href="/dashboard/informasi" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
            
            <div className="p-2 flex-1 flex flex-col justify-center">
              {loading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="p-3 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-2 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  </div>
                ))
              ) : dataInformasiPublik.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <FileText className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Belum ada dokumen informasi publik.</p>
                </div>
              ) : (
                dataInformasiPublik.slice(0, 4).map((doc) => (
                  <Link href="/dashboard/informasi" key={doc.id} className="p-3 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/30 transition-colors">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">{doc.judul}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md truncate max-w-[100px]">{doc.kategori}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{new Date(doc.tanggal_update).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
