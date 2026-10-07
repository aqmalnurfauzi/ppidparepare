'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Landmark, MessageCircle, Send, X } from 'lucide-react';

type Aksi = { label: string; href: string };

type Pesan = {
  id: number;
  dari: 'bot' | 'user';
  teks: string;
  kategori?: string;
  aksi?: Aksi[];
  saran?: string[];
};

const MAKS_PANJANG = 300;

const CHIP: { label: string; tanya: string }[] = [
  { label: 'Syarat Nikah', tanya: 'Bagaimana persyaratan menikah di KUA?' },
  { label: 'Biaya Nikah', tanya: 'Berapa biaya nikah di KUA?' },
  { label: 'Syarat PPID', tanya: 'Apa syarat permohonan informasi publik?' },
  { label: 'Waktu Layanan', tanya: 'Berapa lama permohonan informasi diproses?' },
  { label: 'Daftar Haji', tanya: 'Bagaimana cara daftar haji reguler?' },
  { label: 'Legalisir Ijazah', tanya: 'Bagaimana syarat legalisir ijazah madrasah?' },
  { label: 'Sertifikasi Halal', tanya: 'Bagaimana cara daftar sertifikasi halal gratis?' },
  { label: 'Arah Kiblat', tanya: 'Bagaimana cara mengajukan pengukuran arah kiblat?' },
  { label: 'Jam Layanan', tanya: 'Kapan jam pelayanan ppid buka?' },
];

const SAMBUTAN: Pesan = {
  id: 0,
  dari: 'bot',
  teks:
    'Selamat datang di layanan informasi digital PPID Kementerian Agama Kota Parepare.\n\n' +
    'Silakan pilih topik di atas atau ketik pertanyaan Anda seputar permohonan informasi dan layanan publik kami.',
};

// Halaman yang tidak perlu menampilkan widget (dashboard admin).
const HALAMAN_TANPA_WIDGET = ['/admin'];

export function ChatWidget() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState<Pesan[]>([SAMBUTAN]);
  const [input, setInput] = useState('');
  const [memuat, setMemuat] = useState(false);

  const idBerikut = useRef(1);
  const areaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tombolRef = useRef<HTMLButtonElement>(null);

  // Gulir otomatis ke pesan terbaru
  useEffect(() => {
    areaRef.current?.scrollTo({ top: areaRef.current.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [pesan, memuat, reduceMotion]);

  // Fokus ke input saat dibuka; Escape menutup dan mengembalikan fokus ke tombol
  useEffect(() => {
    if (!buka) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBuka(false);
        tombolRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buka]);

  const tambah = useCallback((p: Omit<Pesan, 'id'>) => {
    setPesan((prev) => [...prev, { ...p, id: idBerikut.current++ }].slice(-60));
  }, []);

  const kirim = useCallback(
    async (teksMentah: string) => {
      const teks = teksMentah.trim().slice(0, MAKS_PANJANG);
      if (!teks || memuat) return;

      tambah({ dari: 'user', teks });
      setInput('');
      setMemuat(true);

      let kode = 0;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12_000);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pesan: teks }),
          signal: ctrl.signal,
        });
        kode = res.status;
        const data = await res.json();
        tambah({
          dari: 'bot',
          teks: typeof data.balasan === 'string' ? data.balasan : 'Maaf, terjadi kesalahan. Silakan coba lagi.',
          kategori: data.status === 'teridentifikasi' ? data.kategori : undefined,
          aksi: Array.isArray(data.aksi) ? data.aksi : [],
          saran: Array.isArray(data.saran) ? data.saran : [],
        });
      } catch {
        tambah({ dari: 'bot', teks: `Layanan sedang tidak terhubung (${kode ? `kode ${kode}` : 'tidak ada respons'}). Silakan coba beberapa saat lagi atau hubungi kami melalui halaman Kontak.`, aksi: [{ label: 'Hubungi Kami', href: '/kontak' }] });
      } finally {
        clearTimeout(timer);
        setMemuat(false);
      }
    },
    [memuat, tambah],
  );

  if (HALAMAN_TANPA_WIDGET.some((p) => pathname?.startsWith(p))) return null;

  const dur = reduceMotion ? 0 : 0.18;

  return (
    <>
      <AnimatePresence>
        {buka && (
          <motion.section
            role="dialog"
            aria-label="Asisten Virtual PPID Kemenag Parepare"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            transition={{ duration: dur }}
            className="fixed bottom-24 left-4 right-4 z-[60] flex h-[min(620px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:left-auto sm:w-[400px]"
          >
            {/* Header */}
            <header className="flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-white">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-700">
                  <Landmark className="h-5 w-5" aria-hidden />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-emerald-600 bg-green-400" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold">Asisten Virtual PPID Kemenag</h2>
                <p className="truncate text-xs text-emerald-100">Layanan Informasi Publik &amp; Administrasi</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBuka(false);
                  tombolRef.current?.focus();
                }}
                aria-label="Tutup asisten virtual"
                className="rounded-lg p-1.5 text-emerald-50 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Topik cepat */}
            <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-slate-50 px-3 py-2.5 [scrollbar-width:thin] dark:border-slate-800 dark:bg-slate-950/50">
              {CHIP.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  disabled={memuat}
                  onClick={() => kirim(c.tanya)}
                  className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Percakapan */}
            <div ref={areaRef} role="log" aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white p-4 dark:bg-slate-900">
              {pesan.map((m) => (
                <div key={m.id} className={`flex max-w-[88%] flex-col gap-2 ${m.dari === 'user' ? 'self-end items-end' : 'self-start items-start'}`}>
                  <div
                    className={`whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.dari === 'user'
                        ? 'rounded-br-sm bg-emerald-600 text-white'
                        : 'rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {m.kategori && (
                      <span className="mb-1.5 block w-fit rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {m.kategori}
                      </span>
                    )}
                    {m.teks /* dirender sebagai teks, bukan HTML: aman dari XSS */}
                  </div>

                  {m.saran && m.saran.length > 0 && (
                    <div className="flex flex-col items-start gap-1.5">
                      {m.saran.map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={memuat}
                          onClick={() => kirim(s)}
                          className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {m.aksi && m.aksi.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.aksi.map((a) => (
                        <Link
                          key={a.href}
                          href={a.href}
                          onClick={() => setBuka(false)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {memuat && (
                <div className="flex w-fit items-center gap-1 self-start rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800" role="status" aria-label="Asisten sedang mengetik">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full bg-slate-400 ${reduceMotion ? '' : 'animate-bounce'}`}
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  maxLength={MAKS_PANJANG}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) kirim(input);
                  }}
                  placeholder="Ketik pertanyaan di sini..."
                  aria-label="Tulis pertanyaan Anda"
                  className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => kirim(input)}
                  disabled={memuat || !input.trim()}
                  aria-label="Kirim pertanyaan"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                Jangan mengirim data pribadi (NIK, nomor HP, alamat) melalui chat ini.
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        ref={tombolRef}
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-label={buka ? 'Tutup asisten virtual' : 'Buka asisten virtual PPID'}
        aria-expanded={buka}
        className="fixed bottom-5 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:right-6"
      >
        {buka ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}

export default ChatWidget;