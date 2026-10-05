'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { HeroCarousel } from '@/components/HeroCarousel';
import { 
  Search, 
  FileText, 
  Download, 
  MessageCircle, 
  ExternalLink, 
  MapPin, 
  Phone, 
  Mail,
  ChevronRight,
  ShieldAlert,
  Info,
  Clock,
  BookOpen,
  LayoutGrid,
  List,
  ChevronLeft,
  Moon,
  Sun,
  Share2,
  Twitter,
  Send,
  Copy,
  ChevronDown,
  BarChart3,
  Newspaper,
  SearchCode,
  CheckCircle2,
  AlertCircle,
  Eye
} from 'lucide-react';
import { KategoriInformasi, defaultBerita, defaultInformasiPublik, defaultFAQs } from '@/lib/data';
import type { DataInformasi } from '@/lib/data';
import { getBerita, getInformasiPublik, getFAQs, cekStatusTiket } from '@/lib/actions';

const categories: { id: KategoriInformasi | 'Semua'; label: string; icon: React.ElementType }[] = [
  { id: 'Semua', label: 'Semua Kategori', icon: BookOpen },
  { id: 'Berkala', label: 'Berkala', icon: Clock },
  { id: 'Setiap Saat', label: 'Setiap Saat', icon: FileText },
  { id: 'Serta Merta', label: 'Serta Merta', icon: Info },
  { id: 'Dikecualikan', label: 'Dikecualikan', icon: ShieldAlert },
];

export default function PPIDKemenagPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<KategoriInformasi | 'Semua'>('Semua');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // New States
  const [yearFilter, setYearFilter] = useState<string>('Semua');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('Semua');
  const [ticketQuery, setTicketQuery] = useState('');
  const [ticketStatus, setTicketStatus] = useState<any>(null);
  const [isCheckingTicket, setIsCheckingTicket] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Database Data States - diinisialisasi langsung dengan default data agar tidak ada jeda skeleton
  const [dataInformasiPublik, setDataInformasiPublik] = useState<DataInformasi[]>(defaultInformasiPublik);
  const [newsData, setNewsData] = useState<any[]>(defaultBerita);
  const [faqsData, setFaqsData] = useState<any[]>(defaultFAQs);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [berita, informasi, faqs] = await Promise.all([
          getBerita(),
          getInformasiPublik(),
          getFAQs()
        ]);
        
        if (berita && berita.length > 0) setNewsData(berita);
        if (informasi && informasi.length > 0) setDataInformasiPublik(informasi);
        if (faqs && faqs.length > 0) setFaqsData(faqs);
      } catch (error) {
        console.error("Failed to load live data:", error);
      }
    }
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return dataInformasiPublik.filter((item) => {
      const matchesSearch = 
        (item.judul || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.deskripsi || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Semua' || item.kategori === activeCategory;
      const matchesYear = yearFilter === 'Semua' || (item.tahun || '').toString() === yearFilter;
      const matchesFileType = fileTypeFilter === 'Semua' || (item.tipe_file || '') === fileTypeFilter;
      
      return matchesSearch && matchesCategory && matchesYear && matchesFileType;
    });
  }, [dataInformasiPublik, searchQuery, activeCategory, yearFilter, fileTypeFilter]);

  // Reset to page 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, yearFilter, fileTypeFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const handleCheckStatus = async () => {
    if (!ticketQuery) return;
    setIsCheckingTicket(true);
    setTicketStatus(null);
    try {
      const res = await cekStatusTiket(ticketQuery);
      if (res.success && res.data) {
        setTicketStatus(res.data.status);
      } else {
        setTicketStatus('not-found');
      }
    } catch (e) {
      setTicketStatus('error');
    } finally {
      setIsCheckingTicket(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-200 dark:selection:bg-emerald-900/50">
      <Navbar />

      {/* Hero Section (Carousel) */}
      <HeroCarousel searchQuery={searchQuery} setSearchQuery={setSearchQuery} newsData={newsData} isLoading={isLoading} />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Menu Layanan Utama / Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-16 relative z-20">
          {[
            { title: 'Informasi Publik', icon: BookOpen, href: '/informasi-publik', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30' },
            { title: 'Standar Layanan', icon: ShieldAlert, href: '/standar-layanan', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { title: 'Permohonan', icon: Send, href: '/ajukan-permohonan', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
            { title: 'Keberatan', icon: AlertCircle, href: '/pengajuan-keberatan', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/30' },
            { title: 'Cek Status', icon: SearchCode, href: '/cek-status', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
            { title: 'Regulasi', icon: FileText, href: '/regulasi', color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/30' },
            { title: 'Galeri', icon: LayoutGrid, href: '/galeri', color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/30' },
            { title: 'Statistik', icon: BarChart3, href: '/statistik', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/30' },
            { title: 'FAQ & Bantuan', icon: MessageCircle, href: '/faq', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/30' },
            { title: 'Kontak Kami', icon: Phone, href: '/kontak', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link key={idx} href={item.href} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col items-center text-center group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{item.title}</h4>
              </Link>
            )
          })}
        </div>

        {/* Dashboard Stats & News */}
        <div id="berita" className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 scroll-mt-24">
          {/* Stats Column */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <BarChart3 className="w-32 h-32 text-emerald-600" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Statistik Informasi Publik</h3>
                  <p className="text-sm text-slate-500">Distribusi dokumen berdasarkan kategori utama</p>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-2 rounded-xl">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-6">
                {[
                  { label: 'Berkala', count: dataInformasiPublik.filter(i => i.kategori === 'Berkala').length, color: 'bg-blue-500' },
                  { label: 'Setiap Saat', count: dataInformasiPublik.filter(i => i.kategori === 'Setiap Saat').length, color: 'bg-emerald-500' },
                  { label: 'Serta Merta', count: dataInformasiPublik.filter(i => i.kategori === 'Serta Merta').length, color: 'bg-amber-500' },
                  { label: 'Dikecualikan', count: dataInformasiPublik.filter(i => i.kategori === 'Dikecualikan').length, color: 'bg-red-500' },
                ].map((stat) => (
                  <div key={stat.label} className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-700 dark:text-slate-300">{stat.label}</span>
                      <span className="text-slate-900 dark:text-white">{stat.count} Dokumen</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(stat.count / dataInformasiPublik.length) * 100}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${stat.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* News Column */}
          <div className="bg-emerald-600 dark:bg-slate-900/50 rounded-3xl p-8 text-white border border-transparent dark:border-slate-800 shadow-xl shadow-emerald-200 dark:shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Newspaper className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Berita Terbaru</h3>
              </div>
              
              <div className="space-y-6 flex-grow">
                {newsData.map((news) => (
                  <Link href={`/berita/${news.slug}`} key={news.id} className="block group cursor-pointer">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-200">
                      <span className="uppercase tracking-widest">{new Date(news.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span className="flex items-center gap-1 opacity-90 font-medium"><Eye className="w-3 h-3" /> {news.views || 0}</span>
                    </div>
                    <h4 className="font-bold text-sm mt-1 group-hover:text-emerald-100 transition-colors line-clamp-2">{news.title}</h4>
                    <p className="text-xs text-emerald-100/70 mt-1 line-clamp-1">{news.summary}</p>
                  </Link>
                ))}
              </div>
              
              <Link href="/berita" className="mt-8 flex items-center justify-center gap-2 py-3 w-full bg-white text-emerald-700 font-bold rounded-2xl hover:bg-emerald-50 transition-colors shadow-lg">
                Semua Berita
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div id="informasi" className="scroll-mt-24 mb-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Daftar Informasi Publik</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Jelajahi berbagai kategori informasi yang kami sediakan untuk masyarakat.</p>
          </div>

          {/* Categories Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none' 
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tahun:</span>
              <select 
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="Semua">Semua Tahun</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2020">2020</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipe File:</span>
              <select 
                value={fileTypeFilter}
                onChange={(e) => setFileTypeFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="Semua">Semua Tipe</option>
                <option value="PDF">PDF</option>
                <option value="Excel">Excel</option>
                <option value="PNG">PNG</option>
              </select>
            </div>
            
            {(yearFilter !== 'Semua' || fileTypeFilter !== 'Semua') && (
              <button 
                onClick={() => {setYearFilter('Semua'); setFileTypeFilter('Semua');}}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-wider underline underline-offset-4"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-white">
                {searchQuery ? `Hasil pencarian untuk "${searchQuery}"` : `Menampilkan ${activeCategory === 'Semua' ? 'semua informasi' : `informasi ${activeCategory}`}`}
              </h4>
              <p className="text-sm text-slate-500 mt-1">Ditemukan {filteredData.length} dokumen yang relevan</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
              
              <span className="hidden sm:inline-block h-6 w-px bg-slate-200 dark:bg-slate-800"></span>
              
              <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                Halaman {currentPage} dari {totalPages || 1}
              </span>
            </div>
          </div>

          {/* Data Rendering */}
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
            <AnimatePresence mode='popLayout'>
              {isLoading ? (
                Array.from({ length: viewMode === 'grid' ? 6 : 3 }).map((_, idx) => (
                  <motion.div
                    key={`skeleton-${idx}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm ${
                      viewMode === 'grid' ? 'p-6 flex flex-col' : 'p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4'
                    }`}
                  >
                    <div className={`animate-pulse ${viewMode === 'grid' ? "flex justify-between items-start mb-4" : "flex sm:flex-col justify-between items-start gap-2 shrink-0 sm:w-28"}`}>
                      <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-md"></div>
                      {viewMode === 'grid' && <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded-md"></div>}
                    </div>
                    
                    <div className={`animate-pulse ${viewMode === 'grid' ? "flex-grow" : "flex-grow w-full min-w-0"}`}>
                      <div className={`h-6 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4 mb-4 ${viewMode === 'grid' ? 'mt-2' : 'mt-0'}`}></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-full mb-2"></div>
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-md w-2/3"></div>
                    </div>
                    
                    <div className={`animate-pulse flex items-center justify-between ${
                      viewMode === 'grid' ? 'mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 w-full' : 'w-full sm:w-auto shrink-0 pt-3 sm:pt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 gap-4'
                    }`}>
                      <div className="flex flex-col gap-2">
                        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      </div>
                      <div className={`bg-slate-200 dark:bg-slate-700 rounded-xl ${
                        viewMode === 'grid' ? 'w-10 h-10' : 'w-12 h-10 px-4'
                      }`}></div>
                    </div>
                  </motion.div>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={item.id}
                    className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group overflow-hidden ${
                      viewMode === 'grid' ? 'p-6 flex flex-col' : 'p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4'
                    }`}
                  >
                    {/* Category & Type */}
                    <div className={viewMode === 'grid' ? "flex justify-between items-start mb-4" : "flex sm:flex-col justify-between items-start gap-2 shrink-0 sm:w-28"}>
                      <span className={`text-[10px] sm:text-xs font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ${
                        item.kategori === 'Berkala' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        item.kategori === 'Setiap Saat' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        item.kategori === 'Serta Merta' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {item.kategori}
                      </span>
                      {item.tipe_file && (
                        <span className="flex items-center text-[10px] sm:text-xs font-medium text-slate-400 gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                          <FileText className="w-3 h-3" />
                          {item.tipe_file}
                        </span>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className={viewMode === 'grid' ? "flex-grow" : "flex-grow min-w-0"}>
                      <div className="flex justify-between items-start gap-4">
                        <h5 className={`font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 ${
                          viewMode === 'grid' ? 'text-lg' : 'text-base sm:text-lg'
                        }`}>
                          {item.judul}
                        </h5>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600 transition-colors" title="Bagikan">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <p className={`text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 ${
                        viewMode === 'grid' ? 'text-sm mb-6' : 'text-xs sm:text-sm mb-0'
                      }`}>
                        {item.deskripsi}
                      </p>
                    </div>
                    
                    {/* Meta & Action */}
                    <div className={`flex items-center justify-between ${
                      viewMode === 'grid' ? 'mt-auto pt-4 border-t border-slate-100 dark:border-slate-800' : 'w-full sm:w-auto shrink-0 pt-3 sm:pt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-slate-100 dark:border-slate-800 gap-4'
                    }`}>
                      <div className="flex flex-col">
                        <span className="text-[10px] sm:text-xs text-slate-400">Tahun {item.tahun} • Update:</span>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {new Date(item.tanggal_update).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      
                      <button 
                        className={`flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 ${
                          viewMode === 'grid' ? 'w-10 h-10' : 'w-12 h-10 px-4 gap-2 text-sm font-semibold'
                        }`} 
                        title="Unduh Dokumen"
                      >
                        <Download className="w-4 h-4" />
                        {viewMode === 'list' && <span className="hidden sm:inline">Unduh</span>}
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800"
                >
                  <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-xl font-bold text-slate-800 dark:text-white mb-2">Informasi Tidak Ditemukan</p>
                  <p className="text-slate-500">Kami tidak dapat menemukan dokumen dengan kriteria tersebut. Silakan coba kata kunci lain.</p>
                  <button 
                    onClick={() => {setSearchQuery(''); setActiveCategory('Semua'); setYearFilter('Semua'); setFileTypeFilter('Semua');}}
                    className="mt-8 text-emerald-600 dark:text-emerald-400 font-semibold hover:text-emerald-700 dark:hover:text-emerald-300 underline underline-offset-4"
                  >
                    Reset Semua Filter
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              
              <div className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        currentPage === page 
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none' 
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-slate-600 dark:text-slate-400"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Permohonan Section with Tracking */}
        <div id="permohonan" className="scroll-mt-24 mb-20 bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl p-8 md:p-12 border border-emerald-100/50 dark:border-emerald-900/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-200 dark:bg-emerald-800 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-200 dark:bg-teal-800 rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 -translate-x-1/2 translate-y-1/2"></div>
          
          <div className="relative z-10 grid md:grid-cols-5 gap-12 items-start">
            <div className="md:col-span-2">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Layanan & Pelacakan</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Ajukan permohonan informasi baru atau pantau status permohonan yang sedang berjalan dengan mudah.
              </p>

              {/* Request Tracking UI */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-900/50 shadow-sm mb-8">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <SearchCode className="w-4 h-4 text-emerald-600" />
                  Cek Status Permohonan
                </h4>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Masukkan ID Tiket..." 
                    value={ticketQuery}
                    onChange={(e) => setTicketQuery(e.target.value)}
                    className="flex-grow bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white"
                  />
                  <button 
                    onClick={handleCheckStatus}
                    disabled={isCheckingTicket}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {isCheckingTicket ? 'Mengecek...' : 'Cek'}
                  </button>
                </div>
                
                <AnimatePresence>
                  {ticketStatus && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                      {ticketStatus === 'not-found' ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400">
                          <AlertCircle className="w-5 h-5" />
                          <div className="text-xs">
                            <p className="font-bold">Status: Tidak Ditemukan</p>
                            <p className="opacity-80">Tiket tidak ditemukan di sistem kami.</p>
                          </div>
                        </div>
                      ) : ticketStatus === 'error' ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400">
                          <AlertCircle className="w-5 h-5" />
                          <div className="text-xs">
                            <p className="font-bold">Error</p>
                            <p className="opacity-80">Terjadi kesalahan saat memeriksa status tiket.</p>
                          </div>
                        </div>
                      ) : (
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${ticketStatus === 'selesai' || ticketStatus === 'ditolak' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
                          {ticketStatus === 'selesai' || ticketStatus === 'ditolak' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                          <div className="text-xs">
                            <p className="font-bold">Status: {ticketStatus?.toUpperCase()}</p>
                            <p className="opacity-80">{ticketStatus === 'selesai' ? 'Pemrosesan telah selesai.' : ticketStatus === 'ditolak' ? 'Pengajuan ditolak/ditutup.' : 'Sedang dalam proses.'}</p>
                          </div>
                        </div>
                      )}
                      <Link href="/cek-status" className="mt-3 block text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 underline underline-offset-2">
                        Lihat Riwayat & Detail Lengkap
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs shrink-0">1</div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Unduh formulir permohonan dalam bentuk PDF.</p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs shrink-0">2</div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Isi data dan deskripsikan informasi yang dibutuhkan.</p>
                </li>
              </ul>
            </div>
            
            <div className="md:col-span-3 grid sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 transition-colors group">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Formulir Manual (PDF)</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 h-10">Unduh formulir permohonan untuk diisi secara manual.</p>
                <button className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Download className="w-4 h-4" />
                  Unduh Form PDF
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-300 transition-colors group">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ExternalLink className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Formulir Online</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 h-10">Isi formulir permohonan langsung via Google Forms.</p>
                <button className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-all group">
                  Isi Google Form
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="sm:col-span-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 shadow-lg shadow-emerald-200 dark:shadow-none text-white flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-emerald-200" />
                    Kirim via WhatsApp
                  </h4>
                  <p className="text-sm text-emerald-100">Kirimkan format isian atau pertanyaan Anda perlahan kepada petugas PPID kami.</p>
                </div>
                <button className="w-full sm:w-auto whitespace-nowrap py-3 px-6 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-sm flex items-center justify-center gap-2">
                  Chat Admin PPID
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Pertanyaan Populer (FAQ)</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Segala hal yang perlu Anda ketahui tentang layanan informasi publik kami.</p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqsData.map((faq, index) => (
              <div key={index} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full p-5 flex items-center justify-between text-left group"
                >
                  <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expandedFaq === index ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedFaq === index && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 dark:border-slate-800"
                    >
                      <div className="p-5 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
