'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Landmark, MessageCircle, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';

type Aksi = { label: string; href: string };
type Nilai = 1 | -1;

type Pesan = {
  id: number;
  dari: 'bot' | 'user';
  teks: string;
  status?: string;
  kategori?: string;
  aksi?: Aksi[];
  saran?: string[];
  idInteraksi?: string; // dari server, untuk mengaitkan umpan balik
  nilai?: Nilai; // umpan balik yang sudah diberikan
  animasi?: boolean; // true selama teks masih "diketik" bertahap
};

const MAKS_PANJANG = 300;
const JEDA_MENGETIK_MS = 600; // jeda minimal agar indikator mengetik terlihat wajar

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
  animasi: true,
  teks:
    'Selamat datang di layanan informasi digital PPID Kementerian Agama Kota Parepare.\n\n' +
    'Silakan pilih topik di atas atau ketik pertanyaan Anda seputar permohonan informasi dan layanan publik kami.',
};

// Halaman yang tidak perlu menampilkan widget (dashboard admin).
const HALAMAN_TANPA_WIDGET = ['/admin'];

// ---------------------------------------------------------------------------
// Potongan kecil
// ---------------------------------------------------------------------------

/** Menampilkan teks bertahap (efek mengetik). Teks lengkap tetap tersedia untuk pembaca layar. */
function TeksBertahap({ teks, animasi, onMaju, onSelesai }: { teks: string; animasi: boolean; onMaju: () => void; onSelesai: () => void }) {
  const potongan = useMemo(() => teks.split(/(\s+)/), [teks]);
  const [n, setN] = useState(animasi ? 0 : potongan.length);

  const majuRef = useRef(onMaju);
  const selesaiRef = useRef(onSelesai);
  useEffect(() => {
    majuRef.current = onMaju;
    selesaiRef.current = onSelesai;
  });

  useEffect(() => {
    if (!animasi) return;
    // Durasi total dibatasi sekitar 1,7 detik berapa pun panjang jawabannya
    const langkah = Math.max(1, Math.ceil(potongan.length / 60));
    const timer = setInterval(() => setN((x) => Math.min(potongan.length, x + langkah)), 28);
    return () => clearInterval(timer);
  }, [animasi, potongan.length]);

  const tampil = animasi ? n : potongan.length;

  useEffect(() => {
    majuRef.current();
    if (animasi && n >= potongan.length) selesaiRef.current();
  }, [n, animasi, potongan.length]);

  return (
    <>
      <span className="sr-only">{teks}</span>
      <span aria-hidden="true">{potongan.slice(0, tampil).join('')}</span>
    </>
  );
}

function AvatarBot() {
  return (
    <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
      <Landmark className="h-3.5 w-3.5" aria-hidden />
    </div>
  );
}

function IndikatorMengetik({ diam }: { diam: boolean }) {
  return (
    <div className="flex items-end gap-2 self-start">
      <AvatarBot />
      <div
        role="status"
        aria-label="Asisten sedang mengetik"
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
            animate={diam ? undefined : { y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
        <span className="ml-1.5 text-xs text-slate-500 dark:text-slate-400">Mengetik…</span>
      </div>
    </div>
  );
}

function UmpanBalik({ nilai, onPilih }: { nilai?: Nilai; onPilih: (n: Nilai) => void }) {
  if (nilai) {
    return (
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-slate-500 dark:text-slate-400">
        {nilai === 1 ? 'Terima kasih atas masukan Anda.' : 'Terima kasih. Masukan Anda kami tinjau untuk perbaikan layanan.'}
      </motion.p>
    );
  }
  const tombol = 'rounded-md p-1.5 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-300';
  return (
    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
      <span>Jawaban ini membantu?</span>
      <motion.button whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.12 }} type="button" onClick={() => onPilih(1)} aria-label="Jawaban ini membantu" className={tombol}>
        <ThumbsUp className="h-3.5 w-3.5" />
      </motion.button>
      <motion.button whileTap={{ scale: 0.8 }} whileHover={{ scale: 1.12 }} type="button" onClick={() => onPilih(-1)} aria-label="Jawaban ini kurang membantu" className={tombol}>
        <ThumbsDown className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Widget utama
// ---------------------------------------------------------------------------
export function ChatWidget() {
  const pathname = usePathname();
  const reduceMotion = !!useReducedMotion();

  const [buka, setBuka] = useState(false);
  const [pesan, setPesan] = useState<Pesan[]>([SAMBUTAN]);
  const [input, setInput] = useState('');
  const [memuat, setMemuat] = useState(false);
  const [sapa, setSapa] = useState(false);

  const idBerikut = useRef(1);
  const areaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tombolRef = useRef<HTMLButtonElement>(null);

  const gulir = useCallback(
    (halus: boolean) => {
      const el = areaRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: halus && !reduceMotion ? 'smooth' : 'auto' });
    },
    [reduceMotion],
  );
  const gulirInstan = useCallback(() => gulir(false), [gulir]);

  // Gulir ke pesan terbaru saat ada pesan baru atau indikator mengetik
  useEffect(() => {
    gulir(true);
  }, [pesan.length, memuat, gulir]);

  // Gelembung sapaan di samping tombol: muncul sekali per sesi setelah 4 detik
  useEffect(() => {
    let sudah = false;
    try {
      sudah = sessionStorage.getItem('ppid-chat-sapa') === '1';
    } catch {
      // penyimpanan tidak tersedia: tampilkan saja
    }
    if (sudah) return;
    const timer = setTimeout(() => setSapa(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const tutupSapa = useCallback(() => {
    setSapa(false);
    try {
      sessionStorage.setItem('ppid-chat-sapa', '1');
    } catch {
      // abaikan
    }
  }, []);

  // Fokus ke input saat dibuka; Escape menutup dan mengembalikan fokus ke tombol
  useEffect(() => {
    if (!buka) return;
    tutupSapa();
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBuka(false);
        tombolRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [buka, tutupSapa]);

  const tambah = useCallback((p: Omit<Pesan, 'id'>) => {
    setPesan((prev) => {
      // pesan baru masuk: pesan sebelumnya langsung ditampilkan penuh
      const lama = prev.map((m) => (m.animasi ? { ...m, animasi: false } : m));
      return [...lama, { ...p, id: idBerikut.current++ }].slice(-60);
    });
  }, []);

  const selesaikanKetik = useCallback(
    (id: number) => {
      setPesan((prev) => prev.map((m) => (m.id === id && m.animasi ? { ...m, animasi: false } : m)));
      // tunggu tombol/saran muncul, lalu gulir
      requestAnimationFrame(() => requestAnimationFrame(() => gulir(true)));
    },
    [gulir],
  );

  const beriUmpan = useCallback((idPesan: number, idInteraksi: string, nilai: Nilai) => {
    setPesan((prev) => prev.map((m) => (m.id === idPesan ? { ...m, nilai } : m)));
    fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idInteraksi, nilai }),
    }).catch(() => {
      // umpan balik bersifat opsional: kegagalan tidak perlu mengganggu pengguna
    });
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
        const jeda = new Promise<void>((r) => setTimeout(r, reduceMotion ? 0 : JEDA_MENGETIK_MS));
        const [res] = await Promise.all([
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pesan: teks }),
            signal: ctrl.signal,
          }),
          jeda,
        ]);
        kode = res.status;
        const data = await res.json();
        tambah({
          dari: 'bot',
          teks: typeof data.balasan === 'string' ? data.balasan : 'Maaf, terjadi kesalahan. Silakan coba lagi.',
          status: typeof data.status === 'string' ? data.status : undefined,
          kategori: data.status === 'teridentifikasi' ? data.kategori : undefined,
          aksi: Array.isArray(data.aksi) ? data.aksi : [],
          saran: Array.isArray(data.saran) ? data.saran : [],
          idInteraksi: typeof data.id === 'string' ? data.id : undefined,
          animasi: !reduceMotion,
        });
      } catch {
        tambah({
          dari: 'bot',
          teks: `Layanan sedang tidak terhubung (${kode ? `kode ${kode}` : 'tidak ada respons'}). Silakan coba beberapa saat lagi atau hubungi kami melalui halaman Kontak.`,
          aksi: [{ label: 'Hubungi Kami', href: '/kontak' }],
        });
      } finally {
        clearTimeout(timer);
        setMemuat(false);
      }
    },
    [memuat, tambah, reduceMotion],
  );

  if (HALAMAN_TANPA_WIDGET.some((p) => pathname?.startsWith(p))) return null;

  const pegas = reduceMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 28 };

  return (
    <>
      {/* Gelembung sapaan */}
      <AnimatePresence>
        {sapa && !buka && (
          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: reduceMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
            transition={pegas}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 right-4 z-[60] max-w-[240px] rounded-2xl rounded-br-sm bg-white px-4 py-3 text-sm text-slate-700 shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700 sm:right-6"
          >
            <button
              type="button"
              onClick={tutupSapa}
              aria-label="Tutup sapaan"
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
            >
              <X className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => setBuka(true)} className="text-left leading-snug">
              Halo! 👋 Ada yang bisa kami bantu seputar layanan PPID?
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel chat */}
      <AnimatePresence>
        {buka && (
          <motion.section
            role="dialog"
            aria-label="Asisten Virtual PPID Kemenag Parepare"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20, scale: reduceMotion ? 1 : 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 16, scale: reduceMotion ? 1 : 0.96 }}
            transition={pegas}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-24 left-4 right-4 z-[60] flex h-[min(620px,calc(100dvh-7rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:left-auto sm:right-6 sm:w-[400px]"
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
                <p className="truncate text-xs text-emerald-100">{memuat ? 'Sedang mengetik…' : 'Online · Layanan Informasi Publik'}</p>
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
              {CHIP.map((c, i) => (
                <motion.button
                  key={c.label}
                  type="button"
                  disabled={memuat}
                  initial={{ opacity: 0, x: reduceMotion ? 0 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduceMotion ? 0 : 0.15 + i * 0.04 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => kirim(c.tanya)}
                  className="shrink-0 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-slate-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                >
                  {c.label}
                </motion.button>
              ))}
            </div>

            {/* Percakapan */}
            <div ref={areaRef} role="log" aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto bg-white p-4 dark:bg-slate-900">
              {pesan.map((m) => {
                const dariUser = m.dari === 'user';
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 10, x: reduceMotion ? 0 : dariUser ? 12 : -12 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                    className={`flex max-w-[92%] items-end gap-2 ${dariUser ? 'self-end' : 'self-start'}`}
                  >
                    {!dariUser && <AvatarBot />}
                    <div className={`flex min-w-0 flex-col gap-2 ${dariUser ? 'items-end' : 'items-start'}`}>
                      <div
                        onClick={() => m.animasi && selesaikanKetik(m.id)}
                        className={`whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          dariUser
                            ? 'rounded-br-sm bg-emerald-600 text-white'
                            : 'rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {m.kategori && (
                          <span className="mb-1.5 block w-fit rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {m.kategori}
                          </span>
                        )}
                        {/* dirender sebagai teks, bukan HTML: aman dari XSS */}
                        {dariUser ? (
                          m.teks
                        ) : (
                          <TeksBertahap teks={m.teks} animasi={!!m.animasi} onMaju={gulirInstan} onSelesai={() => selesaikanKetik(m.id)} />
                        )}
                      </div>

                      {!m.animasi && !dariUser && (
                        <motion.div
                          initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.25 }}
                          className="flex flex-col items-start gap-2"
                        >
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

                          {m.idInteraksi && m.status !== 'sapaan' && (
                            <UmpanBalik nilai={m.nilai} onPilih={(n) => beriUmpan(m.id, m.idInteraksi as string, n)} />
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {memuat && <IndikatorMengetik diam={reduceMotion} />}
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
                <motion.button
                  type="button"
                  onClick={() => kirim(input)}
                  disabled={memuat || !input.trim()}
                  aria-label="Kirim pertanyaan"
                  whileTap={{ scale: 0.88 }}
                  animate={{ rotate: input.trim() && !reduceMotion ? -12 : 0 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </div>
              <p className="mt-2 text-center text-[11px] leading-snug text-slate-400 dark:text-slate-500">
                Percakapan dicatat untuk peningkatan layanan. Jangan mengirim data pribadi (NIK, nomor HP, alamat).
              </p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Tombol melayang */}
      <motion.button
        ref={tombolRef}
        type="button"
        onClick={() => setBuka((b) => !b)}
        aria-label={buka ? 'Tutup asisten virtual' : 'Buka asisten virtual PPID'}
        aria-expanded={buka}
        initial={reduceMotion ? false : { scale: 0, rotate: -90 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 18, delay: 0.6 }}
        whileHover={reduceMotion ? undefined : { scale: 1.08 }}
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        className="fixed bottom-5 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 sm:right-6"
      >
        {/* cincin denyut: hanya beberapa kali agar tidak mengganggu */}
        {!buka && !reduceMotion && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 1.7, opacity: [0.5, 0] }}
            transition={{ duration: 1.6, repeat: 3, ease: 'easeOut', delay: 1.4 }}
          />
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={buka ? 'tutup' : 'buka'}
            className="relative"
            initial={{ rotate: reduceMotion ? 0 : -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: reduceMotion ? 0 : 90, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
          >
            {buka ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}

export default ChatWidget;
