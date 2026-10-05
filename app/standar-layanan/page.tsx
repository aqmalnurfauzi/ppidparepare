'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldCheck, Clock, CreditCard, ArrowRight, FileText, UserCheck, CheckCircle2 } from 'lucide-react';
import { getKontenStatis } from '@/lib/actions';

export default function StandarLayananPage() {
  const [maklumatText, setMaklumatText] = useState('Kami Menyatakan Sanggup Menyelenggarakan Pelayanan Informasi Publik Sesuai Standar Layanan Yang Telah Ditetapkan, Dan Apabila Tidak Menepati Janji, Kami Siap Menerima Sanksi Sesuai Peraturan Perundang-Undangan Yang Berlaku.');

  useEffect(() => {
    async function loadMaklumat() {
      const data = await getKontenStatis('maklumat-layanan');
      if (data && data.isi) {
        setMaklumatText(data.isi);
      }
    }
    loadMaklumat();
  }, []);
  const steps = [
    {
      title: "Mengajukan Permohonan",
      description: "Pemohon mengisi formulir permohonan informasi publik (secara online atau offline) dengan melampirkan identitas diri (KTP/SIM/Paspor).",
      icon: FileText
    },
    {
      title: "Verifikasi Berkas",
      description: "Petugas PPID memeriksa kelengkapan persyaratan dan kejelasan informasi yang diminta.",
      icon: UserCheck
    },
    {
      title: "Proses Pencarian Dokumen",
      description: "PPID berkoordinasi dengan unit terkait untuk mengumpulkan informasi yang diminta.",
      icon: Clock
    },
    {
      title: "Penyerahan Informasi",
      description: "Informasi diserahkan kepada pemohon secara langsung, via email, atau pos sesuai permintaan.",
      icon: CheckCircle2
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-emerald-700 dark:bg-slate-900 bg-gradient-to-br from-emerald-800 to-emerald-600 dark:from-slate-900 dark:to-slate-950 text-white overflow-hidden transition-colors duration-500 py-16 md:py-24">
        <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Standar Layanan Informasi</h2>
            <p className="text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Komitmen kami dalam memberikan layanan informasi publik yang cepat, tepat, dan transparan.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        
        {/* Maklumat Pelayanan */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-sm text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
          <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-6">Maklumat Pelayanan</h3>
          <blockquote className="text-lg md:text-xl font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl mx-auto whitespace-pre-line">
            "{maklumatText}"
          </blockquote>
        </motion.section>

        {/* Waktu & Biaya */}
        <section className="grid md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-6"
          >
            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Waktu Penyelesaian</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Proses penyelesaian permohonan informasi publik dilaksanakan paling lambat <strong className="text-emerald-600 dark:text-emerald-400">10 (sepuluh) hari kerja</strong> sejak permohonan diterima secara lengkap. PPID dapat memperpanjang waktu paling lambat 7 (tujuh) hari kerja dengan memberikan alasan tertulis.
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-6"
          >
            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <CreditCard className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-3">Biaya Layanan</h4>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Penyediaan informasi publik <strong className="text-emerald-600 dark:text-emerald-400">Tidak Dipungut Biaya (GRATIS)</strong>. Namun, biaya penggandaan dokumen (fotokopi) atau media penyimpan (flashdisk/CD) apabila diperlukan, ditanggung secara mandiri oleh pemohon informasi.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Alur Permohonan */}
        <section>
          <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-8 text-center">Alur Permohonan Informasi</h3>
          
          <div className="relative">
            {/* Line connecting steps for desktop */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 rounded-full z-0"></div>
            
            <div className="grid md:grid-cols-4 gap-6 relative z-10">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div 
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center relative group hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm border-4 border-slate-50 dark:border-slate-950">
                      {index + 1}
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white mb-2">{step.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
