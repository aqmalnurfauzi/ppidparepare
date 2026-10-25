'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { 
  ShieldAlert, 
  Send, 
  CheckCircle2, 
  Search, 
  Loader2, 
  Copy, 
  Check, 
  AlertCircle, 
  AlertTriangle, 
  LogIn, 
  ExternalLink,
  X 
} from 'lucide-react';
import { cekStatusTiket, submitKeberatan } from '@/lib/actions';
import { createClient } from '@/lib/supabase/client';

export default function PengajuanKeberatanPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [isTicketValid, setIsTicketValid] = useState<boolean | null>(null);
  const [ticketErrorMessage, setTicketErrorMessage] = useState<string | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [objectionId, setObjectionId] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [submitError, setSubmitError] = useState<{ code: string; message: string } | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [form, setForm] = useState({
    alasan: '',
    kasus_posisi: '',
    nama_pemohon: '',
    telepon: '',
    email: ''
  });

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
          setUserEmail(user.email ?? null);
          setForm(prev => ({
            ...prev,
            email: prev.email || user.email || '',
            nama_pemohon: prev.nama_pemohon || (user.user_metadata?.full_name ?? ''),
          }));
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      }

      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tiketParam = params.get('tiket') || params.get('id');
        if (tiketParam) {
          setTicketNumber(tiketParam);
        }
      }
    }
    checkAuth();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (submitError) setSubmitError(null);
  };

  const handleCheckTicket = async () => {
    const cleanNum = ticketNumber.trim();
    if (cleanNum.length < 5) {
      setIsTicketValid(false);
      setTicketErrorMessage('Nomor tiket permohonan harus diisi dengan benar.');
      return;
    }
    
    setIsChecking(true);
    setTicketErrorMessage(null);
    setSubmitError(null);
    const res = await cekStatusTiket(cleanNum);
    setIsChecking(false);

    if (res.success && res.type === 'permohonan' && res.data) {
      // Invariant check: Objection can only be filed after permohonan is finished (status_proses === 'selesai')
      if (res.data.status_proses !== 'selesai') {
        setIsTicketValid(false);
        setTicketErrorMessage(
          `Permohonan ini masih berstatus "${res.data.status_proses}". Berdasarkan UU KIP dan regulasi PPID, pengajuan keberatan hanya dapat diajukan terhadap permohonan yang telah selesai diproses.`
        );
        setTicketData(null);
        return;
      }

      setIsTicketValid(true);
      setTicketData(res.data);
      setForm(prev => ({
        ...prev,
        nama_pemohon: prev.nama_pemohon || res.data?.nama_pemohon_masked || ''
      }));
    } else {
      setIsTicketValid(false);
      setTicketErrorMessage(res.error || 'Nomor tiket tidak ditemukan atau tidak valid.');
      setTicketData(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketData?.id) {
      setSubmitError({
        code: 'VALIDATION_ERROR',
        message: 'Nomor tiket permohonan yang valid wajib diverifikasi terlebih dahulu.',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const res = await submitKeberatan({
      permohonanId: ticketData.id,
      alasan: form.alasan,
      kasus_posisi: form.kasus_posisi,
    });
    setIsSubmitting(false);

    if (res.success) {
      setObjectionId(res.id || '');
      setIsSuccess(true);
      setForm({ alasan: '', kasus_posisi: '', nama_pemohon: '', telepon: '', email: userEmail || '' });
      setTicketNumber('');
      setIsTicketValid(null);
      setTicketData(null);
    } else {
      const err = res.error as any;
      setSubmitError({
        code: err?.code || 'ACTION_FAILED',
        message: err?.message || 'Gagal mengirim pengajuan keberatan.',
      });
      window.scrollTo({ top: 250, behavior: 'smooth' });
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4 py-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl w-full text-center"
          >
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Keberatan Berhasil Diajukan!</h2>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Pengajuan keberatan Anda telah tercatat secara resmi. Tim Atasan PPID akan meninjau dan memberikan tanggapan tertulis sesuai ketentuan perundang-undangan.
            </p>

            {/* Box Nomor Tiket Keberatan */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Nomor Registrasi Keberatan
                </span>
                <span className="font-mono text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 select-all">
                  {objectionId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(objectionId)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 transition-colors shadow-xs cursor-pointer"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin Nomor</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/cek-status"
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <span>Lacak Status</span>
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button 
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setTicketNumber('');
                  setIsTicketValid(null);
                  setTicketData(null);
                }}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors cursor-pointer"
              >
                Ajukan Keberatan Lain
              </button>
            </div>
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

          {/* Public Open Objection Notice */}
          <div className="mb-6 p-4 bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-300">
              <p className="font-bold text-sm">Layanan Pengajuan Keberatan Informasi Publik</p>
              <p className="mt-1 leading-relaxed">Layanan keberatan ditujukan bagi pemohon yang belum puas terhadap tanggapan informasi publik. Masukkan Nomor Registrasi Permohonan yang telah selesai diproses untuk memulai pengajuan keberatan.</p>
            </div>
          </div>

          {/* Submission Error Alert */}
          {submitError && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 dark:text-rose-200 space-y-1">
                  <p className="font-bold text-sm">Gagal Mengirim Keberatan</p>
                  <p>{submitError.message}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setSubmitError(null)}
                className="p-1 text-rose-400 hover:text-rose-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="space-y-8">
            {/* Ticket Validation Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Nomor Registrasi Permohonan <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  value={ticketNumber}
                  onChange={(e) => {
                    setTicketNumber(e.target.value);
                    if (isTicketValid !== null) setIsTicketValid(null);
                    if (ticketErrorMessage) setTicketErrorMessage(null);
                  }}
                  placeholder="Contoh: PPID-2026-00001" 
                  className="flex-grow bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all uppercase font-mono" 
                />
                <button 
                  type="button"
                  onClick={handleCheckTicket}
                  disabled={isChecking}
                  className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-70 cursor-pointer"
                >
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Cek Data
                </button>
              </div>
              
              {isTicketValid === false && ticketErrorMessage && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{ticketErrorMessage}</span>
                </div>
              )}
            </div>

            {/* Objection Form (Shown only if ticket is valid and finished) */}
            {isTicketValid === true && ticketData && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6"
                onSubmit={handleSubmit}
              >
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                  <div className="flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="font-bold">Permohonan Terverifikasi</p>
                      <p className="mt-0.5">
                        Nomor Registrasi: <strong className="font-mono">{ticketData.nomor_permohonan}</strong> • Pemohon: <strong>{ticketData.nama_pemohon_masked}</strong> • Status: <strong>{ticketData.status_proses}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alasan Keberatan <span className="text-rose-500">*</span></label>
                  <select required name="alasan" value={form.alasan} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer">
                    <option value="">Pilih Alasan Keberatan</option>
                    <option value="Permohonan Informasi Ditolak">Permohonan Informasi Ditolak</option>
                    <option value="Informasi yang Diberikan Tidak Lengkap">Informasi yang Diberikan Tidak Lengkap</option>
                    <option value="Informasi yang Diberikan Tidak Sesuai Permintaan">Informasi yang Diberikan Tidak Sesuai Permintaan</option>
                    <option value="Melewati Batas Waktu 10 Hari Kerja">Melewati Batas Waktu 10 Hari Kerja</option>
                    <option value="Biaya yang Dikenakan Tidak Wajar">Biaya yang Dikenakan Tidak Wajar</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nomor Telepon / WhatsApp</label>
                    <input type="tel" name="telepon" value={form.telepon} onChange={handleChange} placeholder="Contoh: 08123456789" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Email Pemohon</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Contoh: email@domain.com" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Penjelasan Detail Kasus Posisi <span className="text-rose-500">*</span></label>
                  <textarea required name="kasus_posisi" value={form.kasus_posisi} onChange={handleChange} rows={5} placeholder="Jelaskan secara kronologis fakta dan alasan pengajuan keberatan Anda..." className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"></textarea>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                    {isSubmitting ? 'Mengirim Keberatan...' : 'Kirim Keberatan'}
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
