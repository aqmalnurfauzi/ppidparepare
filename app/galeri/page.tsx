'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Image as ImageIcon, Play, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { getGaleri } from '@/lib/actions';

export default function Galeri() {
  const [activeTab, setActiveTab] = useState('Semua');
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getGaleri();
      setGalleryItems(data.map((d: any) => ({
        id: d.id,
        title: d.title,
        date: d.date,
        category: d.category,
        image: d.image_url,
        type: 'image'
      })));
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredItems = activeTab === 'Semua' 
    ? galleryItems 
    : galleryItems.filter(item => item.category === activeTab);

  const categories = ['Semua', 'Kegiatan', 'Infografis', 'Video'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl mb-4 text-emerald-600 dark:text-emerald-400">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-4">Galeri & Infografis</h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Dokumentasi kegiatan, infografis layanan, dan publikasi visual PPID Kemenag Kota Parepare.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-10">
            {categories.map((cat) => (
              <button 
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === cat 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItems.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800 group cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white border border-white/50">
                        <Play className="w-5 h-5 ml-1" />
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-medium rounded-lg shadow-sm">
                      {item.category}
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>{item.date}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
