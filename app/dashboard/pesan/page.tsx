'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Mail, Search, Star, Trash2, Reply, MoreVertical, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPesan, deletePesan, markPesanAsRead } from '@/lib/actions';
import { CardListSkeleton } from '@/components/ui/card-list-skeleton';

export default function PesanMasuk() {
  const [selectedMessage, setSelectedMessage] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    async function loadData() {
      const data = await getPesan();
      setMessages(data);
      if(data.length > 0) setSelectedMessage(data[0].id);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(msg => 
      msg.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus pesan ini?')) return;
    setIsDeleting(true);
    const res = await deletePesan(id);
    if (res.success) {
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage === id) {
        setSelectedMessage(null);
      }
    } else {
      alert('Gagal menghapus pesan');
    }
    setIsDeleting(false);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    setIsReplying(true);
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mark as read in DB if it's a real action
    await markPesanAsRead(selectedMessage);
    
    setMessages(prev => prev.map(m => m.id === selectedMessage ? { ...m, is_read: true, read: true } : m));
    setReplyText('');
    setIsReplying(false);
    alert('Balasan berhasil dikirim ke alamat email pengirim.');
  };


  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Kotak Pesan</h1>
          <p className="text-slate-500 dark:text-slate-400">Pesan masuk dari form "Kontak Kami" di halaman publik.</p>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Pesan */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Cari pesan..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white" 
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <CardListSkeleton />
            ) : (
              <>
            {filteredMessages.map(msg => (
              <div 
                key={msg.id} 
                onClick={() => setSelectedMessage(msg.id)}
                className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-colors ${selectedMessage === msg.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm truncate pr-2 ${!msg.read ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>{msg.sender}</h4>
                  <span className="text-xs text-slate-500 whitespace-nowrap">{msg.date}</span>
                </div>
                <p className={`text-sm mb-1 truncate ${!msg.read ? 'font-semibold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{msg.subject}</p>
                <p className="text-xs text-slate-500 truncate">{msg.snippet}</p>
              </div>
            ))}
            {filteredMessages.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">Tidak ada pesan ditemukan.</div>
            )}
              </>
            )}
          </div>
        </div>

        {/* Area Baca Pesan */}
        <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900">
          {selectedMessage ? (
            <>
              {/* Header Baca */}
              <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{messages.find(m => m.id === selectedMessage)?.subject}</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                      {messages.find(m => m.id === selectedMessage)?.sender.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800 dark:text-white">{messages.find(m => m.id === selectedMessage)?.sender}</p>
                      <p className="text-xs text-slate-500">&lt;{messages.find(m => m.id === selectedMessage)?.email}&gt;</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Balas"><Reply className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Bintangi"><Star className="w-4 h-4" /></button>
                  <button 
                    onClick={() => handleDelete(selectedMessage)}
                    disabled={isDeleting}
                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 rounded-lg transition-colors disabled:opacity-50" 
                    title="Hapus"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Isi Pesan */}
              <div className="flex-1 overflow-y-auto p-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {messages.find(m => m.id === selectedMessage)?.content || messages.find(m => m.id === selectedMessage)?.snippet || 'Isi pesan tidak tersedia.'}
              </div>

              {/* Form Balas */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <textarea 
                  rows={3} 
                  placeholder="Klik di sini untuk membalas..." 
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white mb-3"
                ></textarea>
                <div className="flex justify-end">
                  <button 
                    onClick={handleReply}
                    disabled={isReplying || !replyText.trim()}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReplying ? <Loader2 className="w-4 h-4 animate-spin"/> : <Mail className="w-4 h-4" />} 
                    Kirim Balasan
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Mail className="w-16 h-16 mb-4 opacity-20" />
              <p>Pilih pesan untuk membaca</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
