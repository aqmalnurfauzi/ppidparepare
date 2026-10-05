'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Award, CheckCircle2, Send, Star, ShieldCheck, HeartHandshake, AlertCircle } from 'lucide-react';
import { submitSurveiKepuasan } from '@/lib/actions';

interface SurveyQuestion {
  id: string;
  field: string;
  title: string;
  desc: string;
  options: { score: number; label: string }[];
}

const QUESTIONS: SurveyQuestion[] = [
  {
    id: 'u1',
    field: 'skor_persyaratan',
    title: '1. Persyaratan Pelayanan',
    desc: 'Bagaimana kemudahan dan kejelasan persyaratan yang diperlukan dalam permohonan informasi publik?',
    options: [
      { score: 1, label: 'Tidak Mudah' },
      { score: 2, label: 'Kurang Mudah' },
      { score: 3, label: 'Mudah' },
      { score: 4, label: 'Sangat Mudah' },
    ]
  },
  {
    id: 'u2',
    field: 'skor_prosedur',
    title: '2. Prosedur Pelayanan',
    desc: 'Bagaimana kemudahan alur dan tata cara dalam pengajuan permohonan informasi hingga penyelesaiannya?',
    options: [
      { score: 1, label: 'Tidak Mudah' },
      { score: 2, label: 'Kurang Mudah' },
      { score: 3, label: 'Mudah' },
      { score: 4, label: 'Sangat Mudah' },
    ]
  },
  {
    id: 'u3',
    field: 'skor_waktu',
    title: '3. Waktu Pelayanan',
    desc: 'Bagaimana ketepatan dan kecepatan waktu pemrosesan permohonan informasi oleh petugas (maks. 10 hari kerja)?',
    options: [
      { score: 1, label: 'Tidak Cepat' },
      { score: 2, label: 'Kurang Cepat' },
      { score: 3, label: 'Cepat' },
      { score: 4, label: 'Sangat Cepat' },
    ]
  },
  {
    id: 'u4',
    field: 'skor_biaya',
    title: '4. Biaya / Tarif Pelayanan',
    desc: 'Bagaimana transparansi pembebasan biaya (Layanan informasi publik Kemenag Parepare adalah GRATIS / Rp 0)?',
    options: [
      { score: 1, label: 'Sangat Mahal' },
      { score: 2, label: 'Cukup Mahal' },
      { score: 3, label: 'Murah / Wajar' },
      { score: 4, label: 'Gratis Sesuai Ketentuan' },
    ]
  },
  {
    id: 'u5',
    field: 'skor_produk',
    title: '5. Produk Spesifikasi Pelayanan',
    desc: 'Bagaimana kesesuaian dan kelengkapan salinan dokumen / informasi yang diterima dengan yang dimohonkan?',
    options: [
      { score: 1, label: 'Tidak Sesuai' },
      { score: 2, label: 'Kurang Sesuai' },
      { score: 3, label: 'Sesuai' },
      { score: 4, label: 'Sangat Sesuai' },
    ]
  },
  {
    id: 'u6',
    field: 'skor_kompetensi',
    title: '6. Kompetensi Pelaksana',
    desc: 'Bagaimana kemampuan, pemahaman, dan keahlian petugas PPID dalam merespons kebutuhan informasi Anda?',
    options: [
      { score: 1, label: 'Tidak Kompeten' },
      { score: 2, label: 'Kurang Kompeten' },
      { score: 3, label: 'Kompeten' },
      { score: 4, label: 'Sangat Kompeten' },
    ]
  },
  {
    id: 'u7',
    field: 'skor_perilaku',
    title: '7. Perilaku Pelaksana',
    desc: 'Bagaimana sikap, kesopanan, dan keramahan petugas dalam memberikan pelayanan informasi?',
    options: [
      { score: 1, label: 'Tidak Ramah' },
      { score: 2, label: 'Kurang Ramah' },
      { score: 3, label: 'Sopan & Ramah' },
      { score: 4, label: 'Sangat Sopan & Ramah' },
    ]
  },
  {
    id: 'u8',
    field: 'skor_sarana',
    title: '8. Sarana & Prasarana',
    desc: 'Bagaimana kemudahan akses portal website PPID serta kenyamanan fasilitas ruang layanan publik?',
    options: [
      { score: 1, label: 'Buruk' },
      { score: 2, label: 'Cukup' },
      { score: 3, label: 'Baik' },
      { score: 4, label: 'Sangat Baik' },
    ]
  },
  {
    id: 'u9',
    field: 'skor_penanganan',
    title: '9. Penanganan Pengaduan',
    desc: 'Bagaimana respons dan penanganan tindak lanjut terhadap pengaduan atau pengajuan keberatan informasi?',
    options: [
      { score: 1, label: 'Tidak Ada Tindak Lanjut' },
      { score: 2, label: 'Lambat Ditangani' },
      { score: 3, label: 'Ditangani dengan Baik' },
      { score: 4, label: 'Ditangani Sangat Cepat & Memuaskan' },
    ]
  }
];

export default function SurveiKepuasanPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [scores, setScores] = useState<Record<string, number>>({
    skor_persyaratan: 4,
    skor_prosedur: 4,
    skor_waktu: 4,
    skor_biaya: 4,
    skor_produk: 4,
    skor_kompetensi: 4,
    skor_perilaku: 4,
    skor_sarana: 4,
    skor_penanganan: 4,
  });

  const [form, setForm] = useState({
    nama: '',
    email: '',
    telepon: '',
    pekerjaan: 'Masyarakat Umum',
    pendidikan: 'S1',
    jenis_layanan: 'Permohonan Informasi Publik',
    kritik_saran: ''
  });

  const handleScoreChange = (field: string, score: number) => {
    setScores(prev => ({ ...prev, [field]: score }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      ...form,
      ...scores
    };

    const res = await submitSurveiKepuasan(payload);
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setErrorMsg(typeof res.error === 'string' ? res.error : 'Gagal mengirim survei kepuasan.');
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
            <div className="w-20 h-20 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-4">Terima Kasih Atas Penilaian Anda!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed text-sm md:text-base">
              Survei Kepuasan Masyarakat (SKM) yang Anda berikan telah tersimpan dalam basis data evaluasi berkala PPID Kemenag Kota Parepare sesuai standar PermenPAN-RB No. 14 Tahun 2017.
            </p>
            <button 
              onClick={() => setIsSuccess(false)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-8 rounded-xl transition-colors w-full cursor-pointer"
            >
              Isi Survei Baru
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
      <section className="relative bg-gradient-to-br from-teal-800 via-teal-700 to-emerald-900 text-white overflow-hidden py-16">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-teal-100 text-xs font-semibold mb-4">
              <ShieldCheck className="w-4 h-4" />
              <span>Sesuai PermenPAN-RB No. 14 Tahun 2017</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">Survei Kepuasan Masyarakat (SKM)</h1>
            <p className="text-base md:text-lg text-teal-100 max-w-2xl mx-auto leading-relaxed">
              Berikan penilaian objektif Anda terhadap mutu layanan informasi publik Pejabat Pengelola Informasi dan Dokumentasi Kemenag Kota Parepare.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="bg-teal-100 dark:bg-teal-900/30 p-2.5 rounded-xl text-teal-600 dark:text-teal-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white">Kuesioner Mutu Pelayanan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Penilaian Anda bersifat rahasia dan digunakan untuk evaluasi pelayanan.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Profil Singkat Responden */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Identitas Responden (Opsional)</h3>
              
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    name="nama" 
                    value={form.nama} 
                    onChange={handleTextChange} 
                    placeholder="Boleh dikosongkan (Anonim)" 
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Pekerjaan</label>
                  <select 
                    name="pekerjaan" 
                    value={form.pekerjaan} 
                    onChange={handleTextChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Masyarakat Umum">Masyarakat Umum</option>
                    <option value="Mahasiswa / Pelajar">Mahasiswa / Pelajar</option>
                    <option value="PNS / ASN">PNS / ASN</option>
                    <option value="TNI / POLRI">TNI / POLRI</option>
                    <option value="Pegawai Swasta">Pegawai Swasta</option>
                    <option value="Wiraswasta">Wiraswasta</option>
                    <option value="LSM / Jurnalis">LSM / Jurnalis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Pendidikan Terakhir</label>
                  <select 
                    name="pendidikan" 
                    value={form.pendidikan} 
                    onChange={handleTextChange}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="SLTA / Sederajat">SLTA / Sederajat</option>
                    <option value="D1 / D2 / D3">D1 / D2 / D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 9 Pertanyaan Unsur SKM */}
            <div className="space-y-6">
              {QUESTIONS.map((q, idx) => (
                <div 
                  key={q.id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-teal-400/50 transition-colors"
                >
                  <div className="mb-3">
                    <h4 className="text-sm md:text-base font-bold text-slate-800 dark:text-white">{q.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{q.desc}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {q.options.map((opt) => {
                      const isSelected = scores[q.field] === opt.score;
                      return (
                        <button
                          key={opt.score}
                          type="button"
                          onClick={() => handleScoreChange(q.field, opt.score)}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            isSelected
                              ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 ring-2 ring-teal-500/20 font-bold'
                              : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                          }`}
                        >
                          <span className="text-base">{opt.score === 4 ? '🌟 4' : opt.score === 3 ? '👍 3' : opt.score === 2 ? '😐 2' : '👎 1'}</span>
                          <span className="text-xs leading-tight">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Kritik & Saran */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Saran & Masukan Tambahan untuk Peningkatan Layanan
              </label>
              <textarea 
                rows={4} 
                name="kritik_saran" 
                value={form.kritik_saran} 
                onChange={handleTextChange} 
                placeholder="Tuliskan saran atau masukan Anda di sini..." 
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all text-sm resize-none"
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-md shadow-teal-600/20 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <Send className="w-5 h-5" />
                )}
                {isSubmitting ? 'Mengirim Survei...' : 'Kirim Penilaian Survei'}
              </button>
            </div>

          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
