'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Calendar, ChevronRight, Newspaper, Eye } from 'lucide-react';
export default function BeritaPage() {
  const [dataBerita, setDataBerita] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    import('@/lib/actions').then(({ getBerita }) => {
      getBerita().then(setDataBerita);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      
      {/* Header */}
      <section className="bg-emerald-700 dark:bg-slate-900 text-white py-16 text-center">
        <h1 className="text-4xl font-extrabold mb-4">Berita & Informasi</h1>
        <p className="text-emerald-100 dark:text-slate-400 max-w-2xl mx-auto">
          Berita terbaru seputar layanan, kegiatan, dan kebijakan Kementerian Agama Kota Parepare.
        </p>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataBerita.map((news) => (
            <Link key={news.id} href={`/berita/${news.slug}`} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-200 dark:border-slate-800 flex flex-col group">
              <div className="h-48 bg-emerald-100 dark:bg-slate-800 relative w-full overflow-hidden">
                {news.imageUrl ? (
                  <img src={news.imageUrl} alt={news.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-emerald-600 dark:text-emerald-400/50">
                    <Newspaper className="w-16 h-16 opacity-50 transition-transform duration-500 group-hover:scale-110" />
                  </div>
                )}
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(news.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{news.views || 0}</span>
                  </div>
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                  {news.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 mb-6 flex-grow">
                  {news.summary}
                </p>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                  Baca Selengkapnya <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
