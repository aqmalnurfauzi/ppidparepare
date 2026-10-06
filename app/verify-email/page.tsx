'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MailCheck, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden text-center p-8">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-600 dark:text-emerald-400">
            <MailCheck className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verifikasi Email Anda</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
            Untuk mengakses permohonan informasi dan layanan privat PPID, silakan buka email Anda dan klik tautan verifikasi yang telah kami kirimkan.
          </p>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-500 dark:text-slate-400 mb-6 text-left space-y-2">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Belum menerima email?</p>
            <p>1. Cek folder Spam atau Promosi pada email Anda.</p>
            <p>2. Pastikan alamat email yang Anda masukkan sudah benar.</p>
          </div>

          <a 
            href="/login" 
            className="inline-flex items-center justify-center gap-2 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Login
          </a>
        </div>
      </motion.div>
    </div>
  );
}
