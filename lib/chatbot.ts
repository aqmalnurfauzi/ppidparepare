// lib/chatbot.ts
// Mesin chatbot PPID: TF-IDF + cosine similarity (port dari app.py), tanpa dependensi.
// Fungsi di sini murni (tidak memanggil database) supaya mudah diuji.

export type KbItem = {
  id: string | number;
  kategori: string;
  pertanyaan: string[]; // variasi pertanyaan
  jawaban: string[]; // variasi jawaban (dipilih acak)
};

export type Aksi = { label: string; href: string };

export type ChatStatus = 'teridentifikasi' | 'saran' | 'fallback' | 'sapaan';

export type ChatResult = {
  balasan: string;
  status: ChatStatus;
  kategori: string;
  aksi: Aksi[];
  saran: string[];
  skor: number; // hanya untuk log internal, jangan dikirim ke klien
};

// Pengaturan (silakan sesuaikan setelah diuji dengan pertanyaan nyata)
export const AMBANG_JAWAB = 0.4; // di atas ini: jawab langsung
export const AMBANG_SARAN = 0.2; // di antara saran dan jawab: tawarkan "Maksud Anda?"
const BOBOT_KATA = 0.65;
const BOBOT_KARAKTER = 0.35;
const FAKTOR_ASING = 1.0; // seberapa berat kata di luar korpus menurunkan skor (hasil kalibrasi)

// Pra-pemrosesan
const SLANG: Record<string, string> = {
  gmn: 'bagaimana', gimana: 'bagaimana', bgmn: 'bagaimana', bagaimna: 'bagaimana',
  brp: 'berapa', brapa: 'berapa',
  yg: 'yang', dgn: 'dengan', utk: 'untuk', untk: 'untuk', krn: 'karena',
  tdk: 'tidak', gak: 'tidak', ga: 'tidak', nggak: 'tidak',
  bs: 'bisa', sy: 'saya', dmn: 'dimana', kpn: 'kapan', syrt: 'syarat',
  kawin: 'nikah', thx: 'terimakasih', makasih: 'terimakasih', info: 'informasi',
};

const STOPWORDS = new Set([
  'yang', 'di', 'ke', 'dari', 'dan', 'atau', 'untuk', 'dengan', 'pada', 'adalah',
  'apa', 'apakah', 'bagaimana', 'berapa', 'kapan', 'dimana', 'siapa', 'kah',
  'itu', 'ini', 'saya', 'aku', 'mau', 'ingin', 'bisa', 'dapat', 'ada', 'tolong',
  'mohon', 'tahu', 'tentang', 'soal', 'terkait',
  'kemenag', 'parepare', 'kota', 'kantor', 'dong', 'sih', 'ya', 'nya',
  'aja', 'saja', 'nih', 'deh', 'kok', 'banget', 'doang', 'gitu', 'sih',
  // sapaan & kata pengantar bukan isi pertanyaan
  'assalamualaikum', 'assalamu', 'alaikum', 'alaykum', 'waalaikumsalam', 'tabe', 'iye', 'halo', 'hallo',
  'hai', 'hello', 'hi', 'permisi', 'selamat', 'wr', 'wb', 'warahmatullahi', 'wabarakatuh', 'pak', 'bu',
  'bapak', 'ibu', 'admin', 'min', 'kak', 'kakak', 'mas', 'mbak', 'ppid',
]);

const SUFFIX = ['nya', 'lah', 'kah', 'pun', 'kan', 'an', 'i'];
const PREFIX = [
  'meng', 'meny', 'men', 'mem', 'me', 'peng', 'peny', 'pen', 'pem', 'pe',
  'ber', 'ter', 'di', 'ke', 'se', 'per',
];

export function bersihkan(teks: string): string {
  return teks
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenisasiMentah(teks: string): string[] {
  const t = bersihkan(teks);
  if (!t) return [];
  return t.split(' ').map((w) => SLANG[w] ?? w);
}

/** Stemmer ringan bahasa Indonesia: cukup untuk menyamakan nikah/menikah/pernikahan. */
export function stem(kata: string): string {
  let w = kata;
  if (w.length < 5 || /\d/.test(w)) return w;
  for (const s of SUFFIX) {
    if (w.endsWith(s) && w.length - s.length >= 4) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  for (const p of PREFIX) {
    if (w.startsWith(p) && w.length - p.length >= 4) {
      w = w.slice(p.length);
      break;
    }
  }
  return w;
}

function tokenBermakna(teks: string): string[] {
  return tokenisasiMentah(teks)
    .filter((w) => !STOPWORDS.has(w))
    .map(stem)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
}

function fiturKata(tokens: string[]): string[] {
  const f = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) f.push(`${tokens[i]}_${tokens[i + 1]}`);
  return f;
}

function fiturKarakter(tokens: string[]): string[] {
  const f: string[] = [];
  for (const t of tokens) {
    const p = `#${t}#`;
    for (let i = 0; i + 3 <= p.length; i++) f.push(p.slice(i, i + 3));
  }
  return f;
}

// TF-IDF
type Vec = Map<string, number>;

function tfSublinear(fitur: string[]): Vec {
  const hitung = new Map<string, number>();
  for (const f of fitur) hitung.set(f, (hitung.get(f) ?? 0) + 1);
  const v: Vec = new Map();
  hitung.forEach((n, k) => v.set(k, 1 + Math.log(n)));
  return v;
}

function bobotkan(tf: Vec, idf: Map<string, number>, idfAsing?: number): Vec {
  const v: Vec = new Map();
  let norma = 0;
  tf.forEach((n, k) => {
    const i = idf.get(k);
    if (i === undefined) {
      // Istilah di luar korpus: pada query ikut menambah norma supaya satu kata yang
      // kebetulan cocok tidak menghasilkan skor tinggi (kelemahan TfidfVectorizer biasa).
      if (idfAsing !== undefined) norma += (n * idfAsing) ** 2;
      return;
    }
    const w = n * i;
    v.set(k, w);
    norma += w * w;
  });
  norma = Math.sqrt(norma);
  if (norma === 0) return new Map();
  v.forEach((w, k) => v.set(k, w / norma));
  return v;
}

function kosinus(a: Vec, b: Vec): number {
  const [kecil, besar] = a.size < b.size ? [a, b] : [b, a];
  let s = 0;
  kecil.forEach((w, k) => {
    const x = besar.get(k);
    if (x !== undefined) s += w * x;
  });
  return s;
}

function hitungIdf(dokumen: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  for (const d of dokumen) new Set(d).forEach((k) => df.set(k, (df.get(k) ?? 0) + 1));
  const n = dokumen.length;
  const idf = new Map<string, number>();
  df.forEach((c, k) => idf.set(k, Math.log((1 + n) / (1 + c)) + 1));
  return idf;
}

export type Indeks = {
  items: KbItem[];
  dokumen: { item: number; kata: Vec; karakter: Vec; teks: string }[];
  idfKata: Map<string, number>;
  idfKarakter: Map<string, number>;
  idfAsing: number;
};

export function bangunIndeks(items: KbItem[]): Indeks {
  const mentah: { item: number; kata: string[]; karakter: string[]; teks: string }[] = [];
  items.forEach((it, idx) => {
    for (const q of it.pertanyaan) {
      const tok = tokenBermakna(q);
      if (tok.length === 0) continue;
      mentah.push({ item: idx, kata: fiturKata(tok), karakter: fiturKarakter(tok), teks: q });
    }
  });
  const idfKata = hitungIdf(mentah.map((d) => d.kata));
  const idfKarakter = hitungIdf(mentah.map((d) => d.karakter));
  return {
    items,
    idfKata,
    idfKarakter,
    idfAsing: FAKTOR_ASING * ([...idfKata.values()].reduce((a, b) => a + b, 0) / Math.max(idfKata.size, 1)),
    dokumen: mentah.map((d) => ({
      item: d.item,
      teks: d.teks,
      kata: bobotkan(tfSublinear(d.kata), idfKata),
      karakter: bobotkan(tfSublinear(d.karakter), idfKarakter),
    })),
  };
}

export type Kecocokan = { item: number; skor: number };

/** Skor tertinggi per item FAQ, urut menurun. */
export function cariKecocokan(indeks: Indeks, pertanyaan: string, maks = 3): Kecocokan[] {
  const tok = tokenBermakna(pertanyaan);
  if (tok.length === 0) return [];
  const qKata = bobotkan(tfSublinear(fiturKata(tok)), indeks.idfKata, indeks.idfAsing);
  const qKarakter = bobotkan(tfSublinear(fiturKarakter(tok)), indeks.idfKarakter, indeks.idfAsing);
  const terbaik = new Map<number, number>();
  for (const d of indeks.dokumen) {
    const skor = BOBOT_KATA * kosinus(qKata, d.kata) + BOBOT_KARAKTER * kosinus(qKarakter, d.karakter);
    if (skor > (terbaik.get(d.item) ?? 0)) terbaik.set(d.item, skor);
  }
  return [...terbaik.entries()]
    .map(([item, skor]) => ({ item, skor }))
    .sort((a, b) => b.skor - a.skor)
    .slice(0, maks);
}

// Salam, terima kasih, dan tautan aksi
const KATA_ISLAM = new Set(['assalamualaikum', 'assalamu', 'alaikum', 'alaykum', 'waalaikumsalam']);
const KATA_LOKAL = new Set(['tabe']);
const KATA_UMUM = new Set(['halo', 'hallo', 'hai', 'hello', 'hi', 'pagi', 'siang', 'sore', 'malam', 'permisi']);
const KATA_PENGANTAR = new Set([
  'selamat', 'iye', 'wr', 'wb', 'warahmatullahi', 'wabarakatuh', 'pak', 'bu', 'bapak', 'ibu',
  'admin', 'min', 'kak', 'kakak', 'mas', 'mbak', 'ppid', 'kemenag', 'parepare', 'dan', 'semua',
]);
const KATA_TERIMA_KASIH = new Set(['terimakasih', 'terima', 'kasih', 'thanks', 'banyak', 'atas', 'infonya', 'bantuannya', 'jawabannya', 'ya', 'sangat', 'sip', 'oke', 'ok', 'baik', 'siap']);

function adaKata(tokens: string[], himpunan: Set<string>) {
  return tokens.some((t) => himpunan.has(t));
}

function cekSapaanMurni(teks: string): string | null {
  const t = tokenisasiMentah(teks);
  if (t.length === 0) return null;

  const hanyaSapaan = t.every(
    (w) => KATA_ISLAM.has(w) || KATA_LOKAL.has(w) || KATA_UMUM.has(w) || KATA_PENGANTAR.has(w),
  );
  if (hanyaSapaan) {
    if (adaKata(t, KATA_ISLAM))
      return "Wa'alaikumsalam Warahmatullahi Wabarakatuh. Ada yang bisa kami bantu seputar permohonan informasi publik atau layanan di Kemenag Kota Parepare?";
    if (adaKata(t, KATA_LOKAL))
      return "Iye', tabe' Bapak/Ibu. Ada yang bisa kami bantu mengenai informasi layanan PPID Kemenag Parepare?";
    if (adaKata(t, KATA_UMUM))
      return 'Halo, salam hangat! Ada yang bisa kami bantu seputar layanan publik dan informasi di Kantor Kemenag Kota Parepare?';
  }

  const hanyaTerimaKasih = t.every((w) => KATA_TERIMA_KASIH.has(w) || KATA_PENGANTAR.has(w));
  if (hanyaTerimaKasih && (t.includes('terimakasih') || (t.includes('terima') && t.includes('kasih')) || t.includes('thanks')))
    return 'Sama-sama, Bapak/Ibu. Jika ada pertanyaan lain seputar layanan PPID Kemenag Parepare, silakan ketik kembali.';

  return null;
}

function sapaanPembuka(teks: string): string {
  const t = tokenisasiMentah(teks);
  if (adaKata(t, KATA_ISLAM)) return "Wa'alaikumsalam Warahmatullahi Wabarakatuh. ";
  if (adaKata(t, KATA_LOKAL)) return "Iye', tabe' Bapak/Ibu. ";
  if (t.includes('pagi')) return 'Selamat pagi! ';
  if (t.includes('siang')) return 'Selamat siang! ';
  if (t.includes('sore')) return 'Selamat sore! ';
  if (t.includes('malam')) return 'Selamat malam! ';
  return '';
}

const AKSI_KONTAK: Aksi = { label: 'Hubungi Kami', href: '/kontak' };
const AKSI_PERMOHONAN: Aksi = { label: 'Ajukan Permohonan', href: '/ajukan-permohonan' };

const AKSI_KATEGORI: [RegExp, Aksi[]][] = [
  [/keberatan|sengketa/i, [{ label: 'Ajukan Keberatan', href: '/pengajuan-keberatan' }]],
  [/prosedur|waktu|biaya/i, [AKSI_PERMOHONAN, { label: 'Standar Layanan', href: '/standar-layanan' }]],
  [/klasifikasi/i, [{ label: 'Daftar Informasi Publik', href: '/informasi-publik' }]],
];

function aksiUntuk(kategori: string): Aksi[] {
  for (const [pola, aksi] of AKSI_KATEGORI) if (pola.test(kategori)) return aksi;
  return [AKSI_KONTAK];
}

const VARIASI_PEMBUKA = [
  'Berikut informasi resmi terkait hal yang Anda tanyakan:\n',
  'Terkait hal tersebut, berikut ketentuan resminya:\n',
  'Mengenai hal yang Anda tanyakan di PPID Kemenag Parepare:\n',
];

const POLA_TIKET = /\b(REQ|OBJ)-\d{6}-\d{3}\b/i;

function pilih<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}


// Fungsi utama
export function jawab(indeks: Indeks, pesan: string): ChatResult {
  const kosong = { kategori: '', aksi: [] as Aksi[], saran: [] as string[], skor: 0 };

  // 1. Salam / terima kasih murni
  const balasanSapaan = cekSapaanMurni(pesan);
  if (balasanSapaan) return { ...kosong, balasan: balasanSapaan, status: 'sapaan', kategori: 'Sapaan' };

  // 2. ID tiket: jangan tampilkan data di chat, arahkan ke halaman Cek Status
  if (POLA_TIKET.test(pesan)) {
    return {
      ...kosong,
      status: 'teridentifikasi',
      kategori: 'Cek Status',
      balasan:
        'Untuk menjaga kerahasiaan data pemohon, pengecekan status tiket dilakukan melalui halaman Cek Status. Silakan masukkan ID tiket Anda di sana.',
      aksi: [{ label: 'Buka Cek Status', href: '/cek-status' }],
    };
  }

  // 3. Pencocokan TF-IDF
  const pembuka = sapaanPembuka(pesan);
  const hasil = cariKecocokan(indeks, pesan, 3);
  const terbaik = hasil[0];

  if (terbaik && terbaik.skor >= AMBANG_JAWAB) {
    const item = indeks.items[terbaik.item];
    return {
      balasan: `${pembuka}${pilih(VARIASI_PEMBUKA)}${pilih(item.jawaban)}`,
      status: 'teridentifikasi',
      kategori: item.kategori,
      aksi: aksiUntuk(item.kategori),
      saran: [],
      skor: terbaik.skor,
    };
  }

  // 4. Mirip tapi belum yakin: tawarkan pilihan
  if (terbaik && terbaik.skor >= AMBANG_SARAN) {
    const saran = hasil
      .filter((h) => h.skor >= AMBANG_SARAN)
      .map((h) => indeks.items[h.item].pertanyaan[0])
      .filter((q, i, arr) => arr.indexOf(q) === i);
    return {
      balasan: `${pembuka}Mohon maaf, kami belum yakin maksud pertanyaan Anda. Apakah salah satu topik berikut yang Anda maksud?`,
      status: 'saran',
      kategori: '',
      aksi: [],
      saran,
      skor: terbaik.skor,
    };
  }

  // 5. Tidak ada di basis data
  return {
    balasan:
      `${pembuka}Mohon maaf, layanan informasi atau jawaban untuk pertanyaan tersebut saat ini belum tersedia pada basis data kami.\n\n` +
      'Silakan ajukan permohonan informasi secara tertulis atau berkonsultasi langsung melalui Meja Layanan PPID / PTSP Kantor Kementerian Agama Kota Parepare.',
    status: 'fallback',
    kategori: '',
    aksi: [AKSI_PERMOHONAN, AKSI_KONTAK],
    saran: [],
    skor: terbaik?.skor ?? 0,
  };
}