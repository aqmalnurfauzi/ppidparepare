'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Kontak() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    sender: '',
    email: '',
    subject: '',
    snippet: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { submitPesan } = await import('@/lib/actions');
      const res = await submitPesan(form);
      if (res.success) {
        setSuccess(true);
        alert("Pesan berhasil dikirim!");
        setForm({ sender: '', email: '', subject: '', snippet: '' });
      } else {
        alert("Gagal mengirim pesan.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-4">Kontak Kami</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Hubungi layanan PPID Kementerian Agama Kota Parepare untuk pertanyaan, saran, atau informasi lebih lanjut.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            
            {/* Contact Info & Map */}
            <div className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-6">
                
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2">Alamat</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Jl. Jenderal Sudirman No.30, Cappa Galung, Kec. Bacukiki Bar., Kota Parepare, Sulawesi Selatan 91122
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2">Jam Layanan</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">
                    Senin - Kamis: 08.00 - 16.00 WITA<br/>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    Jumat: 08.00 - 16.30 WITA
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2">Telepon / WhatsApp</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    (0421) 21133<br/>
                    +62 812-3456-7890 (WA)
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 dark:text-white mb-2">Email</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    ppid.parepare@kemenag.go.id<br/>
                    kota.parepare@kemenag.go.id
                  </p>
                </div>

              </div>

              {/* Map Embed */}
              <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 h-64 overflow-hidden">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3979.805719918342!2d119.6260689!3d-4.0371813!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2d95bbc9821a435f%3A0xc79cf1ff70b536ac!2sKemenag%20Kota%20Parepare!5e0!3m2!1sid!2sid!4v1689658000000!5m2!1sid!2sid" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0, borderRadius: '0.75rem' }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Lokasi Kemenag Parepare"
                ></iframe>
              </div>
            </div>

            {/* Contact Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 p-8"
            >
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Kirim Pesan</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nama Lengkap</label>
                    <input 
                      type="text" 
                      name="sender"
                      value={form.sender}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="Masukkan nama Anda"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email</label>
                    <input 
                      type="email" 
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="email@contoh.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Subjek</label>
                  <input 
                    type="text" 
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="Judul pesan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pesan</label>
                  <textarea 
                    rows={5}
                    name="snippet"
                    value={form.snippet}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                    placeholder="Tulis pesan Anda di sini..."
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  className="w-full px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Kirim Pesan Sekarang
                </button>

              </form>
            </motion.div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
