'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Moon, Sun, Menu, X, ChevronDown } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { motion, AnimatePresence } from 'motion/react';

export function Navbar() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);

  const toggleMobileDropdown = (name: string) => {
    setOpenMobileDropdown(openMobileDropdown === name ? null : name);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
              <img src="/logo-kemenag.png" alt="Logo Kemenag" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg leading-tight text-slate-800 dark:text-white">PPID Kemenag</h1>
              <p className="text-[10px] md:text-xs font-medium text-emerald-600">Kota Parepare</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Beranda</Link>
            
            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
                Profil
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col py-2">
                <Link href="/profil" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Tentang PPID</Link>
                <Link href="/regulasi" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Regulasi & Dasar Hukum</Link>
              </div>
            </div>

            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
                Layanan
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col py-2 z-50">
                <Link href="/standar-layanan" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Standar Layanan</Link>
                <Link href="/faq" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">FAQ (Tanya Jawab)</Link>
                <Link href="/layanan-kepegawaian" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Layanan Kepegawaian</Link>
              </div>
            </div>

            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
                Formulir & Survei
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col py-2 z-50">
                <Link href="/ajukan-permohonan" className="block px-4 py-2.5 text-sm font-medium text-[#017119] dark:text-[#4ade80] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors">
                  Formulir Permohonan Informasi
                </Link>
                <Link href="/pengajuan-keberatan" className="block px-4 py-2.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors">
                  Formulir Pengajuan Keberatan
                </Link>
                <Link href="/partisipasi" className="block px-4 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors">
                  Formulir Partisipasi Publik
                </Link>
                <Link href="/survei-kepuasan-masyarakat" className="block px-4 py-2.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors">
                  Survei Kepuasan Masyarakat
                </Link>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                <Link href="/cek-status" className="block px-4 py-2.5 text-sm font-bold text-[#017119] dark:text-[#4ade80] hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                  Cek Status Permohonan
                </Link>
              </div>
            </div>

            <div className="relative group">
              <button className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
                Informasi & Publikasi
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute top-full left-0 mt-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col py-2">
                <Link href="/informasi-publik" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Daftar Informasi Publik</Link>
                <Link href="/berita" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Berita Terkini</Link>
                <Link href="/galeri" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Galeri</Link>
                <Link href="/statistik" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">Statistik</Link>
                <Link href="/faq" className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400">FAQ</Link>
              </div>
            </div>

            <Link href="/kontak" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Kontak</Link>
            
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-all border border-slate-200 dark:border-slate-700"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col space-y-3">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="font-medium text-slate-800 dark:text-slate-200 py-2">
                Beranda
              </Link>
              
              <div className="flex flex-col">
                <button 
                  onClick={() => toggleMobileDropdown('profil')}
                  className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 py-2"
                >
                  Profil
                  <ChevronDown className={`w-4 h-4 transition-transform ${openMobileDropdown === 'profil' ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                <AnimatePresence>
                  {openMobileDropdown === 'profil' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-col pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2 mt-1 space-y-2 overflow-hidden"
                    >
                      <Link href="/profil" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">Tentang PPID</Link>
                      <Link href="/regulasi" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">Regulasi & Dasar Hukum</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col">
                <button 
                  onClick={() => toggleMobileDropdown('layanan')}
                  className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 py-2"
                >
                  Layanan
                  <ChevronDown className={`w-4 h-4 transition-transform ${openMobileDropdown === 'layanan' ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                <AnimatePresence>
                  {openMobileDropdown === 'layanan' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-col pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2 mt-1 space-y-2 overflow-hidden"
                    >
                      <Link href="/standar-layanan" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">Standar Layanan</Link>
                      <Link href= "/layanan-kepegawaian" onClick={() => setIsMobileMenuOpen(false)} className='text-sm text-slate-600 dark:text-slate-400 py-1.5'>Layanan Kepegawaian</Link>
                      <Link href="/faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">FAQ (Tanya Jawab)</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col">
                <button 
                  onClick={() => toggleMobileDropdown('formulir')}
                  className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 py-2"
                >
                  Formulir & Survei
                  <ChevronDown className={`w-4 h-4 transition-transform ${openMobileDropdown === 'formulir' ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                <AnimatePresence>
                  {openMobileDropdown === 'formulir' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-col pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2 mt-1 space-y-2 overflow-hidden"
                    >
                      <Link href="/ajukan-permohonan" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-[#017119] dark:text-[#4ade80] py-1.5">Formulir Permohonan Informasi</Link>
                      <Link href="/pengajuan-keberatan" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-orange-600 dark:text-orange-400 py-1.5">Formulir Pengajuan Keberatan</Link>
                      <Link href="/partisipasi" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-blue-600 dark:text-blue-400 py-1.5">Formulir Partisipasi Publik</Link>
                      <Link href="/survei-kepuasan-masyarakat" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-medium text-teal-600 dark:text-teal-400 py-1.5">Survei Kepuasan Masyarakat</Link>
                      <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                      <Link href="/cek-status" onClick={() => setIsMobileMenuOpen(false)} className="text-sm font-bold text-[#017119] dark:text-[#4ade80] py-1.5">Cek Status Permohonan</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex flex-col">
                <button 
                  onClick={() => toggleMobileDropdown('informasi')}
                  className="flex items-center justify-between font-medium text-slate-800 dark:text-slate-200 py-2"
                >
                  Informasi & Publikasi
                  <ChevronDown className={`w-4 h-4 transition-transform ${openMobileDropdown === 'informasi' ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                <AnimatePresence>
                  {openMobileDropdown === 'informasi' && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-col pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-2 mt-1 space-y-2 overflow-hidden"
                    >
                      <Link href="/informasi-publik" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">Daftar Informasi Publik</Link>
                      <Link href="/berita" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">Berita Terkini</Link>
                      <Link href="/galeri" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">Galeri</Link>
                      <Link href="/statistik" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">Statistik</Link>
                      <Link href="/faq" onClick={() => setIsMobileMenuOpen(false)} className="text-sm text-slate-600 dark:text-slate-400 py-1.5">FAQ</Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Link href="/kontak" onClick={() => setIsMobileMenuOpen(false)} className="font-medium text-slate-800 dark:text-slate-200 py-2">
                Kontak
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
