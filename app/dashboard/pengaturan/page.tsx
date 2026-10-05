'use client';

import React, { useState, useEffect } from 'react';
import { Save, Building2, Phone, Mail, Globe, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPengaturan, updatePengaturan } from '@/lib/actions';

export default function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [form, setForm] = useState({
    site_name: '',
    site_short_name: '',
    site_description: '',
    contact_email: '',
    contact_phone: '',
    contact_address: ''
  });

  useEffect(() => {
    async function loadData() {
      const data = await getPengaturan();
      setForm({
        site_name: data.site_name || '',
        site_short_name: data.site_short_name || '',
        site_description: data.site_description || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        contact_address: data.contact_address || ''
      });
      setLoading(false);
    }
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updatePengaturan(form);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      alert('Gagal menyimpan pengaturan');
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Pengaturan Sistem</h1>
        <p className="text-slate-500 dark:text-slate-400">Konfigurasi profil instansi dan informasi kontak publik.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
      >
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Section: Profil Instansi */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              Profil Instansi
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Instansi</label>
                <input 
                  type="text" 
                  name="site_name"
                  value={form.site_name}
                  onChange={handleChange}
                  placeholder="Kantor Kementerian Agama Kota Parepare"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Singkatan / Akronim</label>
                <input 
                  type="text" 
                  name="site_short_name"
                  value={form.site_short_name}
                  onChange={handleChange}
                  placeholder="Kemenag Parepare"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Deskripsi Singkat</label>
                <textarea 
                  rows={3}
                  name="site_description"
                  value={form.site_description}
                  onChange={handleChange}
                  placeholder="Layanan Pejabat Pengelola Informasi dan Dokumentasi (PPID) pada Kantor Kementerian Agama Kota Parepare."
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800"></div>

          {/* Section: Informasi Kontak */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              Informasi Kontak
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400"/> Email Resmi</label>
                <input 
                  type="email" 
                  name="contact_email"
                  value={form.contact_email}
                  onChange={handleChange}
                  placeholder="ppid@kemenagparepare.go.id"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400"/> Nomor Telepon / WhatsApp</label>
                <input 
                  type="text" 
                  name="contact_phone"
                  value={form.contact_phone}
                  onChange={handleChange}
                  placeholder="(0421) 123456"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400"/> Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  name="contact_address"
                  value={form.contact_address}
                  onChange={handleChange}
                  placeholder="Jl. Jend. Sudirman No. 1, Kota Parepare, Sulawesi Selatan"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-4">
          {isSaved && (
            <span className="text-emerald-600 flex items-center gap-2 text-sm font-medium animate-pulse">
              <CheckCircle className="w-4 h-4" /> Tersimpan
            </span>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Perubahan</span>
          </button>
        </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
