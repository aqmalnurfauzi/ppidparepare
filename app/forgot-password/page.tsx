'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ShieldAlert, CheckCircle2, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/app/actions/auth';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);

    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200 dark:bg-emerald-900/40 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 dark:opacity-20 translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-200 dark:bg-teal-900/40 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 dark:opacity-20 -translate-x-1/2 translate-y-1/2"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
          
          <div className="bg-emerald-600 dark:bg-slate-800/80 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-slate-800 dark:to-slate-900 opacity-90"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm p-2">
                <img src="/logo-kemenag.png" alt="Logo Kemenag" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
              <p className="text-emerald-100 dark:text-slate-400 text-sm">Kirim tautan pemulihan kata sandi</p>
            </div>
          </div>

          <div className="p-8">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-3"
              >
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{success}</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Terdaftar</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                    placeholder="nama@email.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-emerald-200 dark:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    Kirim Tautan Reset
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <a href="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-semibold hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Kembali ke halaman Login
                </a>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
