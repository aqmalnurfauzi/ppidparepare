'use client';

import React, { useEffect, useState } from 'react';
import { History, Search, Download, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { getLogAktivitas } from '@/lib/actions';
import { TableSkeleton } from '@/components/ui/table-skeleton';

export default function LogAktivitasPage() {
  const [dataLog, setDataLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      const data = await getLogAktivitas();
      setDataLog(data.map((item: any) => ({
        ...item,
        user: item.user_name // map DB column to UI
      })));
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredData = dataLog.filter(item => 
    item.user.toLowerCase().includes(search.toLowerCase()) || 
    item.aksi.toLowerCase().includes(search.toLowerCase()) ||
    item.ip_address?.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const csvContent = [
      ["Waktu", "Pengguna", "Aktivitas", "Alamat IP"],
      ...filteredData.map(item => [item.waktu, item.user, item.aksi, item.ip_address])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "log_aktivitas.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Log Aktivitas</h1>
          <p className="text-slate-500 dark:text-slate-400">Jejak rekam (audit trail) dari seluruh aktivitas sistem oleh pengguna.</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export Log (.csv)</span>
        </button>
      </div>

      {/* Filter/Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari aktivitas, pengguna, atau IP..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Filter className="w-4 h-4" /> Filter Tanggal
          </button>
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
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Aktivitas</th>
                <th className="px-6 py-4">Alamat IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[13px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada log ditemukan.
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
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {item.waktu}
                  </td>
                  <td className="px-6 py-4 font-sans font-medium text-slate-800 dark:text-slate-200">
                    {item.user}
                  </td>
                  <td className="px-6 py-4 font-sans">
                    <span className="font-bold text-slate-900 dark:text-white block">{item.aksi}</span>
                    <span className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 block truncate max-w-[300px]">{item.detail}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {item.ip_address}
                  </td>
                </motion.tr>
              )))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}
