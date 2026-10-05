'use client';

import React, { useState, useEffect } from 'react';
import { Save, Bell, Mail, ToggleLeft, ToggleRight, CheckCircle, Loader2 } from 'lucide-react';
import { getPengaturan, updatePengaturan } from '@/lib/actions';

export default function PengaturanNotifikasi() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const [form, setForm] = useState({
    email_diterima_subject: '',
    email_diterima_body: '',
    email_selesai_subject: '',
    email_selesai_body: ''
  });

  useEffect(() => {
    async function loadData() {
      const data = await getPengaturan();
      setForm({
        email_diterima_subject: data.email_diterima_subject || '',
        email_diterima_body: data.email_diterima_body || '',
        email_selesai_subject: data.email_selesai_subject || '',
        email_selesai_body: data.email_selesai_body || ''
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
      alert('Gagal menyimpan pengaturan notifikasi');
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Notifikasi & Email Gateway</h1>
          <p className="text-slate-500 dark:text-slate-400">Atur template email otomatis yang dikirimkan ke pemohon.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                Permohonan Diterima
              </h3>
              <p className="text-sm text-slate-500">Dikirim otomatis saat masyarakat selesai mengisi form permohonan.</p>
            </div>
            <button className="text-emerald-600">
              <ToggleRight className="w-10 h-10" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Subjek Email</label>
              <input 
                type="text" 
                name="email_diterima_subject"
                value={form.email_diterima_subject}
                onChange={handleChange}
                placeholder="[PPID Parepare] Permohonan Informasi Diterima - {{ticket_id}}" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Isi Pesan</label>
              <textarea 
                rows={4} 
                name="email_diterima_body"
                value={form.email_diterima_body}
                onChange={handleChange}
                placeholder="Yth. {{nama_pemohon}},\n\nPermohonan informasi Anda telah kami terima..." 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-y"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-600" />
                Permohonan Selesai / Dokumen Tersedia
              </h3>
              <p className="text-sm text-slate-500">Dikirim saat admin mengunggah dokumen balasan.</p>
            </div>
            <button className="text-emerald-600">
              <ToggleRight className="w-10 h-10" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Subjek Email</label>
              <input 
                type="text" 
                name="email_selesai_subject"
                value={form.email_selesai_subject}
                onChange={handleChange}
                placeholder="[PPID Parepare] Permohonan Selesai - {{ticket_id}}" 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Isi Pesan</label>
              <textarea 
                rows={4} 
                name="email_selesai_body"
                value={form.email_selesai_body}
                onChange={handleChange}
                placeholder="Yth. {{nama_pemohon}},\n\nInformasi yang Anda mohonkan telah tersedia..." 
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white resize-y"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="text-sm text-slate-500">Gunakan tag <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">&#123;&#123;nama_pemohon&#125;&#125;</code> atau <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">&#123;&#123;ticket_id&#125;&#125;</code> untuk variabel dinamis.</div>
          <div className="flex items-center gap-4">
            {isSaved && <span className="text-emerald-600 flex items-center gap-1 text-sm font-medium animate-pulse"><CheckCircle className="w-4 h-4" /> Tersimpan</span>}
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />} 
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
          </>
        )}

      </div>
    </div>
  );
}
