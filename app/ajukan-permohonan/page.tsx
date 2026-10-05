'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Upload, Send, FileText, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react';
import { submitPermohonan } from '@/lib/actions';
import { uploadToSupabaseStorage } from '@/lib/storage';

export default function AjukanPermohonanPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatusText, setSubmitStatusText] = useState('Mengirim...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const [fileKtp, setFileKtp] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    kategori_pemohon: '',
    nik: '',
    nama: '',
    alamat: '',
    telepon: '',
    email: '',
    kebutuhan: '',
    tujuan_penggunaan: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (file: File) => {
    setFileError(null);
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!hasValidExt && !validMimes.includes(file.type)) {
      setFileError('Format file tidak didukung. Harap unggah file JPG, PNG, atau PDF.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileError('Ukuran file terlalu besar. Maksimal 2MB.');
      return;
    }

    setFileKtp(file);
    if (file.type.startsWith('image/') || hasValidExt && !file.name.toLowerCase().endsWith('.pdf')) {
      const objUrl = URL.createObjectURL(file);
      setPreviewUrl(objUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileKtp(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fileKtp) {
      setFileError('Kartu Identitas (KTP/Paspor) wajib diunggah.');
      const el = document.getElementById('dropzone-ktp');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatusText('Mengunggah kartu identitas...');

    let fileKtpUrl = '';
    try {
      const uploadRes = await uploadToSupabaseStorage(fileKtp, 'dokumen');
      if (uploadRes.error || !uploadRes.url) {
        setIsSubmitting(false);
        setFileError(`Gagal mengunggah file: ${uploadRes.error || 'Terjadi kesalahan sistem saat upload.'}`);
        return;
      }
      fileKtpUrl = uploadRes.url;
    } catch (uploadErr: any) {
      setIsSubmitting(false);
      setFileError(`Gagal mengunggah file: ${uploadErr.message || 'Terjadi kesalahan jaringan.'}`);
      return;
    }

    setSubmitStatusText('Menyimpan permohonan...');
    const res = await submitPermohonan({
      ...form,
      file_ktp_url: fileKtpUrl
    });
    setIsSubmitting(false);
    
    if (res.success) {
      setTicketId(res.id || '');
      setIsSuccess(true);
      setFileKtp(null);
      setPreviewUrl(null);
      setForm({
        kategori_pemohon: '', nik: '', nama: '', alamat: '', telepon: '', email: '', kebutuhan: '', tujuan_penggunaan: ''
      });
    } else {
      const errObj = res.error as any;
      alert('Gagal mengirim permohonan: ' + (errObj?.message || 'Terjadi kesalahan saat menyimpan'));
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
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-4">Permohonan Berhasil Dikirim!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              Terima kasih. Permohonan informasi Anda telah kami terima dengan nomor tiket pengajuan <strong className="text-emerald-600 dark:text-emerald-400">{ticketId}</strong>. Kami akan memproses permohonan Anda dalam waktu maksimal 10 hari kerja.
            </p>
            <button 
              onClick={() => setIsSuccess(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full"
            >
              Ajukan Permohonan Lain
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
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Form Permohonan Informasi</h2>
            <p className="text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Silakan isi formulir di bawah ini dengan lengkap dan benar untuk mengajukan permohonan informasi publik.
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
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Formulir Permohonan</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Kategori Pemohon <span className="text-rose-500">*</span></label>
                <select 
                  required 
                  name="kategori_pemohon"
                  value={form.kategori_pemohon}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                >
                  <option value="">Pilih Kategori</option>
                  <option value="perorangan">Perorangan</option>
                  <option value="kelompok">Kelompok / Organisasi</option>
                  <option value="badan_hukum">Badan Hukum</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nomor Identitas (NIK/No. Paspor) <span className="text-rose-500">*</span></label>
                <input required type="text" name="nik" value={form.nik} onChange={handleChange} placeholder="Masukkan 16 digit NIK" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap (Sesuai Identitas) <span className="text-rose-500">*</span></label>
              <input required type="text" name="nama" value={form.nama} onChange={handleChange} placeholder="Masukkan nama lengkap" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap <span className="text-rose-500">*</span></label>
              <textarea required rows={3} name="alamat" value={form.alamat} onChange={handleChange} placeholder="Masukkan alamat lengkap" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"></textarea>
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

            <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Rincian Informasi yang Dibutuhkan <span className="text-rose-500">*</span></label>
                <textarea required rows={4} name="kebutuhan" value={form.kebutuhan} onChange={handleChange} placeholder="Jelaskan secara detail informasi yang Anda butuhkan..." className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"></textarea>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tujuan Penggunaan Informasi <span className="text-rose-500">*</span></label>
              <textarea required rows={2} name="tujuan_penggunaan" value={form.tujuan_penggunaan} onChange={handleChange} placeholder="Sebutkan tujuan penggunaan informasi tersebut..." className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"></textarea>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Unggah Kartu Identitas (KTP/Paspor) <span className="text-rose-500">*</span>
              </label>

              <input 
                ref={fileInputRef}
                type="file" 
                id="file-ktp-input"
                className="hidden" 
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              {!fileKtp ? (
                <div 
                  id="dropzone-ktp"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileChange(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group select-none ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[1.01]' 
                      : fileError
                      ? 'border-rose-400 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="w-14 h-14 mx-auto mb-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-bold mb-1">
                    Klik untuk memilih file atau seret file ke sini
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Maksimal 2MB (Format: JPG, PNG, WEBP, PDF)
                  </p>
                </div>
              ) : (
                <div className="border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/40 dark:bg-emerald-950/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {previewUrl ? (
                      <div className="w-16 h-14 rounded-xl overflow-hidden border border-emerald-400/50 dark:border-emerald-600/50 shrink-0 bg-white dark:bg-slate-800 shadow-xs">
                        <img src={previewUrl} alt="Preview KTP" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                        <FileText className="w-7 h-7" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {fileKtp.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {(fileKtp.size / (1024 * 1024)).toFixed(2)} MB • {fileKtp.type || 'Dokumen'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-300 dark:border-emerald-700 rounded-xl transition-colors"
                    >
                      Ganti File
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                      title="Hapus file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {fileError && (
                <p className="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1.5 mt-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {fileError}
                </p>
              )}
            </div>

            <div className="pt-6">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSubmitting ? submitStatusText : 'Kirim Permohonan'}
              </button>
            </div>

          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
