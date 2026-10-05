'use client';

import React, { use } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Calendar, ChevronLeft, Newspaper, Share2, Check, Eye } from 'lucide-react';
import { getBeritaBySlug, incrementBeritaViews } from '@/lib/actions';
import { RenderFormattedContent } from '@/components/RenderFormattedContent';

export default function BeritaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [newsItem, setNewsItem] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const hasIncrementedRef = React.useRef(false);

  React.useEffect(() => {
    let isMounted = true;

    getBeritaBySlug(resolvedParams.slug).then((item) => {
      if (!isMounted) return;
      if (item) {
        setNewsItem(item);
        if (!hasIncrementedRef.current) {
          hasIncrementedRef.current = true;
          incrementBeritaViews(resolvedParams.slug).then((res) => {
            if (res.success && isMounted) {
              setNewsItem((prev: any) => prev ? { ...prev, views: (prev.views || 0) + 1 } : prev);
            }
          });
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [resolvedParams.slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: newsItem?.title,
        text: newsItem?.summary || newsItem?.title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-medium text-slate-500">Memuat berita...</div>;

  if (!newsItem) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/berita" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors mb-8">
          <ChevronLeft className="w-4 h-4" /> Kembali ke Indeks Berita
        </Link>
        
        <article className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="h-64 sm:h-96 bg-emerald-100 dark:bg-slate-800 relative w-full">
            {newsItem.imageUrl ? (
              <img src={newsItem.imageUrl} alt={newsItem.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-emerald-600 dark:text-emerald-400/50">
                <Newspaper className="w-24 h-24 opacity-50" />
              </div>
            )}
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={handleShare}
                title="Bagikan atau salin link"
                className="flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Link Disalin!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          <div className="p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold mb-4">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Calendar className="w-4 h-4" />
                <span>{new Date(newsItem.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{newsItem.views || 0} pembaca</span>
              </div>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
              {newsItem.title}
            </h1>
            
            {newsItem.summary && (
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-8 italic border-l-4 border-emerald-500 pl-4 py-1 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-r-xl">
                {newsItem.summary}
              </p>
            )}
            
            <RenderFormattedContent content={newsItem.content} />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
