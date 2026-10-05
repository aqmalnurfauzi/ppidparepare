'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ChevronDown, MessageCircleQuestion, MapPin, Phone, Mail, Clock } from 'lucide-react';
import { getFAQs } from '@/lib/actions';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getFAQs();
      setFaqs(data);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-emerald-700 dark:bg-slate-900 bg-gradient-to-br from-emerald-800 to-emerald-600 dark:from-slate-900 dark:to-slate-950 text-white overflow-hidden transition-colors duration-500 py-16 md:py-24">
        <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">FAQ & Kontak</h2>
            <p className="text-lg text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
              Temukan jawaban untuk pertanyaan umum mengenai layanan PPID, atau hubungi kami langsung.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          
          {/* FAQ Accordion (Takes up 3/5 width on large screens) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
                <MessageCircleQuestion className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">Pertanyaan Sering Diajukan</h3>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div 
                    key={index} 
                    className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-emerald-300 dark:border-emerald-700 shadow-md shadow-emerald-100 dark:shadow-none' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-slate-700'}`}
                  >
                    <button
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none"
                    >
                      <span className={`font-bold pr-8 ${isOpen ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {faq.question}
                      </span>
                      <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                    </button>
                    
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/50 pt-4 mt-2 mx-6">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Information (Takes up 2/5 width) */}
          <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                Hubungi Kami
              </h3>
              
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Alamat Kantor</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      Jl. Jenderal Sudirman No. 71, Cappa Galung, Kec. Bacukiki Barat, Kota Parepare, Sulawesi Selatan 91122
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Telepon / WhatsApp</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      (0421) 21133<br />
                      +62 811 411 2345 (WA Only)
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Email</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      kemenagparepare@kemenag.go.id<br />
                      ppid.parepare@gmail.com
                    </p>
                  </div>
                </li>
                
                <li className="flex gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">Jam Layanan Operasional</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      Senin - Kamis: 08.00 - 16.00 WITA<br />
                      Jumat: 08.00 - 16.30 WITA<br />
                      Istirahat: 12.00 - 13.00 WITA
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            
            {/* Map Placeholder or iframe */}
            <div className="bg-slate-200 dark:bg-slate-800 rounded-3xl h-64 border border-slate-300 dark:border-slate-700 overflow-hidden relative shadow-sm">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3979.6468498059086!2d119.62678687497496!3d-4.011666695961614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2d95b0b2e81134fb%3A0xe74d11bbbfce8db1!2sKementerian%20Agama%20Kota%20Parepare!5e0!3m2!1sen!2sid!4v1700000000000!5m2!1sen!2sid" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="Peta Lokasi Kemenag Parepare"
                className="absolute inset-0"
              ></iframe>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
