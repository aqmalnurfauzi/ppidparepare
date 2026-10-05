'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookOpen, Download, Scale, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRegulasi } from '@/lib/actions';

export default function Regulasi() {
  const [regulations, setRegulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getRegulasi();
      setRegulations(data);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl mb-4 text-emerald-600 dark:text-emerald-400">
              <Scale className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-4">Regulasi & Dasar Hukum</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Kumpulan peraturan perundang-undangan dan dasar hukum pelaksanaan Keterbukaan Informasi Publik di lingkungan Kementerian Agama Kota Parepare.
            </p>
          </div>

          <div className="grid gap-4">
            {regulations.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-6 items-start md:items-center hover:shadow-md transition-shadow group"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors">
                  <BookOpen className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                      {item.type}
                    </span>
                    <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg">
                      Tahun {item.year}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">{item.description}</p>
                </div>

                <div className="shrink-0 w-full md:w-auto flex items-center justify-between md:flex-col gap-4">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3" /> PDF • {item.size}
                  </span>
                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white font-medium rounded-xl transition-colors text-sm">
                    <Download className="w-4 h-4" /> Unduh
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
