'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ShieldAlert, Send, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { cekStatusTiket, submitKeberatan } from '@/lib/actions';

export default function PengajuanKeberatanPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isTicketValid, setIsTicketValid] = useState<boolean | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [objectionId, setObjectionId] = useState('');

  const [form, setForm] = useState({
    alasan: '',
    kasus_posisi: '',
    nama_pemohon: '',
    telepon: '',
    email: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckTicket = async () => {
    if (ticketNumber.length < 5) {
      setIsTicketValid(false);
      return;
    }
    
    setIsChecking(true);
    const res = await cekStatusTiket(ticketNumber);
    setIsChecking(false);

    if (res.success && res.type === 'permohonan') {
      setIsTicketValid(true);
      setTicketData(res.data);
      // Pre-fill some data if needed, but permohonan doesn't have email/telepon yet if old data
      setForm(prev => ({
        ...prev,
        nama_pemohon: res.data.nama || ''
      }));
    } else {
      setIsTicketValid(false);
      setTicketData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      ...form,
      tiket_referensi: ticketNumber
    };

    const res = await submitKeberatan(payload);
    setIsSubmitting(false);

    if (res.success) {
      setObjectionId(res.id || '');
      setIsSuccess(true);
      setForm({ alasan: '', kasus_posisi: '', nama_pemohon: '', telepon: '', email: '' });
      setTicketNumber('');
      setIsTicketValid(null);
    } else {
      alert('Gagal mengirim keberatan');
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
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-4">Keberatan Berhasil Diajukan!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Pengajuan keberatan Anda dengan ID Tiket <strong className="text-emerald-600 dark:text-emerald-400">{objectionId}</strong> telah kami terima. Tim Atasan PPID akan segera meninjau ulang permohonan Anda.
            </p>
            <button 
              onClick={() => {
                setIsSuccess(false);
                setTicketNumber('');
                setIsTicketValid(null);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full"
            >
              Kembali
            </button>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-emerald-700 dark:bg-slate-900 bg-gradient-to-br from-emerald-800 to-emerald-600 dark:from-slate-900 dark:to-slate-950 text-white overflow-hidden transition-colors duration-500 py-16">
        <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Pengajuan Keberatan</h2>
            <p className="text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Sampaikan keberatan Anda jika permohonan informasi ditolak, tidak ditanggapi, atau tidak sesuai permintaan.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Form Keberatan</h3>
          </div>

          <div className="space-y-8">
            {/* Ticket Validation Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nomor Tiket Permohonan <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="Contoh: REQ-2024-001" 
                  className="flex-grow bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase" 
                />
                <button 
                  onClick={handleCheckTicket}
                  disabled={isChecking}
                  className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70"
                >
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Cek Data
                </button>
              </div>
              
              {isTicketValid === false && (
                <p className="text-rose-500 text-sm mt-3 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4" /> Nomor tiket tidak ditemukan atau tidak valid.
                </p>
              )}
            </div>

            {/* Objection Form (Shown only if ticket is valid) */}
            {isTicketValid === true && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6"
                onSubmit={handleSubmit}
              >
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50 mb-6">
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">
                    Data permohonan atas nama <strong>{ticketData?.nama}</strong> ditemukan. Silakan lengkapi form keberatan di bawah ini.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alasan Keberatan <span className="text-rose-500">*</span></label>
                  <select required name="alasan" value={form.alasan} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all">
                    <option value="">Pilih Alasan</option>
                    <option value="Permohonan Informasi Ditolak">Permohonan Informasi Ditolak</option>
                    <option value="Informasi yang Diberikan Tidak Lengkap">Informasi yang Diberikan Tidak Lengkap</option>
                    <option value="Informasi yang Diberikan Tidak Sesuai Permintaan">Informasi yang Diberikan Tidak Sesuai Permintaan</option>
                    <option value="Melewati Batas Waktu 10 Hari Kerja">Melewati Batas Waktu 10 Hari Kerja</option>
                    <option value="Biaya yang Dikenakan Tidak Wajar">Biaya yang Dikenakan Tidak Wajar</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nomor Telepon / WhatsApp <span className="text-rose-500">*</span></label>
                    <input required type="tel" name="telepon" value={form.telepon} onChange={handleChange} placeholder="Contoh: 08123456789" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Aktif <span className="text-rose-500">*</span></label>
                    <input required type="email" name="email" value={form.email} onChange={handleChange} placeholder="Contoh: email@domain.com" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Penjelasan Detail Kasus / Keberatan <span className="text-rose-500">*</span></label>
                  <textarea required name="kasus_posisi" value={form.kasus_posisi} onChange={handleChange} rows={5} placeholder="Jelaskan secara detail alasan keberatan Anda..." className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"></textarea>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {isSubmitting ? 'Mengirim...' : 'Kirim Keberatan'}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
