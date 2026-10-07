// app/api/chat/route.ts
import { NextResponse, after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { bangunIndeks, jawab, type Indeks, type KbItem } from '@/lib/chatbot';
import fallbackKb from '@/data/chatbot-faq.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAKS_PANJANG = 300;
const BATAS_REQUEST = 15; // per IP
const JENDELA_MS = 60_000;
const CACHE_MS = 5 * 60_000; // basis pengetahuan dimuat ulang tiap 5 menit
const BATAS_DB_MS = 3000; // jika Supabase lebih lambat dari ini, pakai data cadangan

/** Membatasi waktu tunggu query Supabase agar chatbot tidak ikut macet saat database tidak terjangkau. */
function batasWaktu<T>(p: PromiseLike<T>, ms = BATAS_DB_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const habis = new Promise<never>((_, tolak) => {
    timer = setTimeout(() => tolak(new Error('Supabase tidak merespons')), ms);
  });
  return Promise.race([Promise.resolve(p), habis]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Rate limit sederhana (per instance server).
// Di hosting serverless (mis. Vercel) tiap instance punya memori sendiri, jadi ini
// hanya pengaman dasar. Untuk perlindungan ketat gunakan Upstash Redis / WAF hosting.
// ---------------------------------------------------------------------------
const hits = new Map<string, number[]>();

function terlaluBanyak(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < JENDELA_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (v.every((t) => now - t >= JENDELA_MS)) hits.delete(k);
    });
  }
  return recent.length > BATAS_REQUEST;
}

function ambilIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'tak-dikenal';
}

// ---------------------------------------------------------------------------
// Basis pengetahuan: tabel chatbot_kb + tabel faqs (FAQ di website). Cadangan: data/chatbot-faq.json
// ---------------------------------------------------------------------------
type BarisKb = { id: number; kategori: string | null; pertanyaan_variasi: string[] | null; jawaban_variasi: string[] | null };
type BarisFaq = { id: number; question: string | null; answer: string | null };

let cache: { indeks: Indeks; kedaluwarsa: number } | null = null;

function dariJsonLokal(): KbItem[] {
  return (fallbackKb as { id: number; kategori: string; pertanyaan_variasi: string[]; jawaban_variasi: string[] }[]).map((r) => ({
    id: `lokal-${r.id}`,
    kategori: r.kategori,
    pertanyaan: r.pertanyaan_variasi,
    jawaban: r.jawaban_variasi,
  }));
}

async function ambilIndeks(): Promise<Indeks> {
  if (cache && cache.kedaluwarsa > Date.now()) return cache.indeks;

  let items: KbItem[] = [];

  try {
    const { data, error } = await batasWaktu(
      supabase.from('chatbot_kb').select('id,kategori,pertanyaan_variasi,jawaban_variasi').eq('aktif', true),
    );
    if (!error && data) {
      items = (data as BarisKb[])
        .filter((r) => r.pertanyaan_variasi?.length && r.jawaban_variasi?.length)
        .map((r) => ({
          id: `kb-${r.id}`,
          kategori: r.kategori || 'Umum',
          pertanyaan: r.pertanyaan_variasi as string[],
          jawaban: r.jawaban_variasi as string[],
        }));
    }
  } catch (e) {
    console.error('chatbot_kb gagal dimuat:', e);
  }
  if (items.length === 0) items = dariJsonLokal();

  // FAQ website ikut menjadi pengetahuan chatbot, jadi perubahan dari dashboard admin langsung berlaku.
  try {
    const { data, error } = await batasWaktu(supabase.from('faqs').select('id,question,answer'));
    if (!error && data) {
      for (const r of data as BarisFaq[]) {
        if (r.question && r.answer) {
          items.push({ id: `faq-${r.id}`, kategori: 'FAQ', pertanyaan: [r.question], jawaban: [r.answer] });
        }
      }
    }
  } catch (e) {
    console.error('faqs gagal dimuat:', e);
  }

  const indeks = bangunIndeks(items);
  cache = { indeks, kedaluwarsa: Date.now() + CACHE_MS };
  return indeks;
}

// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  if (terlaluBanyak(ambilIp(req))) {
    return NextResponse.json(
      { balasan: 'Terlalu banyak permintaan. Mohon tunggu sebentar lalu coba kembali.', status: 'fallback', kategori: '', aksi: [], saran: [] },
      { status: 429, headers: { 'Retry-After': '60' } },
    );
  }

  let pesan = '';
  try {
    const body = await req.json();
    pesan = typeof body?.pesan === 'string' ? body.pesan.trim() : '';
  } catch {
    // body bukan JSON valid -> ditangani di bawah
  }

  if (!pesan) {
    return NextResponse.json({ balasan: 'Silakan masukkan pertanyaan Anda.', status: 'fallback', kategori: '', aksi: [], saran: [] }, { status: 400 });
  }
  if (pesan.length > MAKS_PANJANG) {
    return NextResponse.json(
      { balasan: `Pertanyaan terlalu panjang (maksimal ${MAKS_PANJANG} karakter). Mohon dipersingkat.`, status: 'fallback', kategori: '', aksi: [], saran: [] },
      { status: 400 },
    );
  }

  const indeks = await ambilIndeks();
  const hasil = jawab(indeks, pesan);

  // Catat pertanyaan yang tidak terjawab agar admin bisa menambah FAQ baru dari data ini.
  if (hasil.status === 'fallback' || hasil.status === 'saran') {
    after(async () => {
      try {
        await supabase.from('chatbot_log').insert({ pesan, status: hasil.status, skor: Number(hasil.skor.toFixed(3)) });
      } catch (e) {
        console.error('chatbot_log gagal ditulis:', e);
      }
    });
  }

  // Skor kemiripan sengaja tidak dikirim ke klien.
  return NextResponse.json({
    balasan: hasil.balasan,
    status: hasil.status,
    kategori: hasil.kategori,
    aksi: hasil.aksi,
    saran: hasil.saran,
  });
}