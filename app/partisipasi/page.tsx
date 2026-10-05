'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MessageSquare, Send, CheckCircle2, MessageCircle, AlertCircle, HeartHandshake } from 'lucide-react';
import { submitPartisipasiPublik } from '@/lib/actions';

export default function PartisipasiPublikPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    nama: '',
    email: '',
    telepon: '',
    jenis: 'saran', // saran, kritik, pendapat
    judul: '',
    pesan: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleJenisSelect = (jenis: 'saran' | 'kritik' | 'pendapat') => {
    setForm(prev => ({ ...prev, jenis }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await submitPartisipasiPublik(form);
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      setForm({
        nama: '',
        email: '',
        telepon: '',
        jenis: 'saran',
        judul: '',
        pesan: ''
      });
    } else {
      setErrorMsg(typeof res.error === 'string' ? res.error : 'Gagal mengirim partisipasi publik.');
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full text-center"
          >
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-4">Terima Kasih Atas Partisipasi Anda!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-sm md:text-base">
              Masukan, saran, dan aspirasi Anda sangat berharga bagi peningkatan mutu keterbukaan informasi dan pelayanan publik di lingkungan Kemenag Kota Parepare.
            </p>
            <button 
              onClick={() => setIsSuccess(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full cursor-pointer"
            >
              Kirim Masukan Lainnya
            </button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-900 text-white overflow-hidden py-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-blue-100 text-xs font-semibold mb-4">
              <HeartHandshake className="w-4 h-4" />
              <span>Ruang Aspirasi & Konsultasi Publik</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Formulir Partisipasi Publik</h1>
            <p className="text-base md:text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Sampaikan saran, kritik konstruktif, atau aspirasi Anda secara terbuka demi terwujudnya tata kelola keterbukaan informasi publik yang transparan dan akuntabel.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Formulir Aspirasi & Masukan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Silakan lengkapi formulir di bawah ini dengan jelas dan santun.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Pilihan Jenis Partisipasi */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Jenis Partisipasi <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleJenisSelect('saran')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    form.jenis === 'saran'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm">💡 Saran</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ide perbaikan mutu pelayanan</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleJenisSelect('kritik')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    form.jenis === 'kritik'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm">⚠️ Kritik Konstruktif</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Evaluasi terhadap kekurangan layanan</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleJenisSelect('pendapat')}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    form.jenis === 'pendapat'
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <p className="font-bold text-sm">💬 Pendapat / Aspirasi</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pandangan umum masyarakat</p>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap <span className="text-rose-500">*</span></label>
                <input 
                  required 
                  type="text" 
                  name="nama" 
                  value={form.nama} 
                  onChange={handleChange} 
                  placeholder="Contoh: Muhammad Ihsan" 
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Aktif <span className="text-rose-500">*</span></label>
                <input 
                  required 
                  type="email" 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  placeholder="contoh: email@domain.com" 
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" 
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nomor Telepon / WhatsApp</label>
                <input 
                  type="tel" 
                  name="telepon" 
                  value={form.telepon} 
                  onChange={handleChange} 
                  placeholder="Contoh: 081234567890" 
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Topik / Judul Masukan <span className="text-rose-500">*</span></label>
                <input 
                  required 
                  type="text" 
                  name="judul" 
                  value={form.judul} 
                  onChange={handleChange} 
                  placeholder="Sebutkan inti pokok masukan Anda..." 
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Isi Masukan / Aspirasi Lengkap <span className="text-rose-500">*</span>
              </label>
              <textarea 
                required 
                rows={5} 
                name="pesan" 
                value={form.pesan} 
                onChange={handleChange} 
                placeholder="Tuliskan uraian lengkap saran, kritik, atau pandangan Anda di sini..." 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm resize-none"
              ></textarea>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSubmitting ? 'Mengirim...' : 'Kirim Masukan Publik'}
              </button>
            </div>

          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
