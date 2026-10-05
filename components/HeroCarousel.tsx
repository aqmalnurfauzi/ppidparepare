'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface HeroCarouselProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  newsData: any[];
  isLoading?: boolean;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ searchQuery, setSearchQuery, newsData = [], isLoading = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto slide
  useEffect(() => {
    if (!newsData || newsData.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % newsData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [newsData.length]);

  const handlePrev = () => {
    if (!newsData || newsData.length === 0) return;
    setCurrentIndex((prev) => (prev === 0 ? newsData.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!newsData || newsData.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % newsData.length);
  };

  // 1. Tampilkan skeleton hanya jika sedang dalam proses loading DAN belum ada data sama sekali
  if (isLoading && (!newsData || newsData.length === 0)) {
    return (
      <section className="relative w-full min-h-[650px] md:h-[700px] bg-slate-900 overflow-hidden flex flex-col justify-center py-20 md:py-0">
        <div className="absolute inset-0 bg-slate-800 animate-pulse" />
        <div className="relative z-20 max-w-5xl mx-auto px-4 w-full pt-12 md:pt-16 pb-16 md:pb-0">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1 w-full text-center md:text-left">
              <div className="h-6 w-32 bg-slate-700 rounded-full mb-6 mx-auto md:mx-0 animate-pulse" />
              <div className="h-12 md:h-16 w-3/4 bg-slate-700 rounded-xl mb-4 mx-auto md:mx-0 animate-pulse" />
              <div className="h-12 md:h-16 w-1/2 bg-slate-700 rounded-xl mb-8 mx-auto md:mx-0 animate-pulse" />
              <div className="h-4 w-full bg-slate-700 rounded mb-2 mx-auto md:mx-0 animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-700 rounded mb-2 mx-auto md:mx-0 animate-pulse" />
              <div className="h-4 w-4/6 bg-slate-700 rounded mb-8 mx-auto md:mx-0 animate-pulse" />
              <div className="h-12 w-40 bg-slate-700 rounded-xl mx-auto md:mx-0 animate-pulse" />
            </div>
          </div>
          <div className="mt-8 md:mt-16 max-w-3xl mx-auto md:mx-0 w-full relative">
            <div className="h-16 md:h-20 w-full bg-slate-700 rounded-2xl animate-pulse" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-slate-50 dark:text-slate-950 transition-colors duration-500">
            <path d="M0 48H1440V0C1440 0 1140 48 720 48C300 48 0 0 0 0V48Z" fill="currentColor"/>
          </svg>
        </div>
      </section>
    );
  }

  // 2. Jika loading selesai tapi tidak ada berita, tampilkan banner default PPID
  if (!newsData || newsData.length === 0) {
    return (
      <section className="relative w-full min-h-[650px] md:h-[700px] bg-slate-900 overflow-hidden flex flex-col justify-center transition-colors duration-500 group/hero py-20 md:py-0">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 z-0" />
        <div className="absolute inset-0 bg-slate-900/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent z-10" />

        {/* Ambient glow effects */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 -right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Main Content */}
        <div className="relative z-20 max-w-5xl mx-auto px-4 w-full pt-12 md:pt-16 pb-16 md:pb-0">
          <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
            <div className="flex-1 w-full text-center md:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wider mb-6 backdrop-blur-sm">
                  PORTAL RESMI PPID
                </span>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-lg leading-tight">
                  Layanan Keterbukaan Informasi Publik
                </h1>
                <p className="text-lg text-slate-300 mb-8 drop-shadow-md">
                  Pejabat Pengelola Informasi dan Dokumentasi (PPID) Kementerian Agama Kota Parepare berkomitmen memberikan pelayanan informasi publik yang transparan, efektif, dan akuntabel.
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <a 
                    href="#informasi"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-emerald-500/25"
                  >
                    Jelajahi Dokumen <ArrowRight className="w-4 h-4" />
                  </a>
                  <Link
                    href="/ajukan-permohonan"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold backdrop-blur-sm transition-colors border border-white/10"
                  >
                    Ajukan Permohonan
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Global Search Bar */}
          <div className="mt-8 md:mt-16 max-w-3xl mx-auto md:mx-0 w-full relative group">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500">
                <Search className="h-6 w-6" />
              </div>
              <input
                type="text"
                placeholder="Cari dokumen, laporan, SOP, atau info publik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 md:py-5 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-md text-white placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 shadow-2xl text-lg transition-all border border-white/20 dark:border-slate-700/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </motion.div>
          </div>
        </div>

        {/* Bottom Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-slate-50 dark:text-slate-950 transition-colors duration-500">
            <path d="M0 48H1440V0C1440 0 1140 48 720 48C300 48 0 0 0 0V48Z" fill="currentColor"/>
          </svg>
        </div>
      </section>
    );
  }

  const currentNews = newsData[currentIndex] || newsData[0];


  return (
    <section className="relative w-full min-h-[650px] md:h-[700px] bg-slate-900 overflow-hidden flex flex-col justify-center transition-colors duration-500 group/hero py-20 md:py-0">
      {/* Background Images */}
      <AnimatePresence mode="popLayout">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          className="absolute inset-0 z-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentNews.imageUrl}
            alt={currentNews.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-slate-900/40 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent z-10" />

      {/* Main Content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 w-full pt-12 md:pt-16 pb-16 md:pb-0">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
          
          <div className="flex-1 w-full text-center md:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="max-w-2xl"
              >
                <span className="inline-block py-1 px-3 rounded-full bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wider mb-6 backdrop-blur-sm">
                  INFO TERBARU
                </span>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white drop-shadow-lg leading-tight">
                  {currentNews.title}
                </h2>
                <p className="text-lg text-slate-300 mb-8 drop-shadow-md line-clamp-3">
                  {currentNews.summary}
                </p>
                <Link 
                  href={`/berita/${currentNews.slug}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-colors shadow-lg hover:shadow-emerald-500/25"
                >
                  Selengkapnya <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Global Search Bar Overlay at Bottom of Hero */}
        <div className="mt-8 md:mt-16 max-w-3xl mx-auto md:mx-0 w-full relative group">
           <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
           >
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-500">
                <Search className="h-6 w-6" />
              </div>
              <input
                type="text"
                placeholder="Cari dokumen, laporan, SOP, atau info publik..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-12 py-4 md:py-5 rounded-2xl bg-white/10 dark:bg-slate-800/80 backdrop-blur-md text-white placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 shadow-2xl text-lg transition-all border border-white/20 dark:border-slate-700/50"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
           </motion.div>
        </div>
      </div>

      {/* Navigation Controls (hanya tampil jika berita > 1) */}
      {newsData.length > 1 && (
        <div className="absolute inset-x-0 bottom-12 md:bottom-12 z-30 flex justify-center gap-4 md:justify-end md:px-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrev}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors border border-white/10"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex gap-2">
              {newsData.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-emerald-500 w-8' : 'bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            <button 
              onClick={handleNext}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors border border-white/10"
              aria-label="Next slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto text-slate-50 dark:text-slate-950 transition-colors duration-500">
          <path d="M0 48H1440V0C1440 0 1140 48 720 48C300 48 0 0 0 0V48Z" fill="currentColor"/>
        </svg>
      </div>
    </section>
  );
};
