// app/api/chat/feedback/route.ts
// Menerima umpan balik 👍 (1) / 👎 (-1) untuk satu jawaban chatbot.
import { NextResponse, after } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ambilIp, terlaluBanyak } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const LOG_AKTIF = process.env.CHATBOT_LOG !== 'off';
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  if (terlaluBanyak(`fb:${ambilIp(req)}`, 30)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: { 'Retry-After': '60' } });
  }

  let id = '';
  let nilai = 0;
  try {
    const body = await req.json();
    id = typeof body?.id === 'string' ? body.id : '';
    nilai = Number(body?.nilai);
  } catch {
    // body bukan JSON valid -> ditolak di bawah
  }

  if (!POLA_UUID.test(id) || (nilai !== 1 && nilai !== -1)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (LOG_AKTIF) {
    after(async () => {
      try {
        // Satu suara per interaksi (kolom interaksi_id bersifat unik di database)
        await supabase.from('chatbot_umpan_balik').insert({ interaksi_id: id, nilai });
      } catch (e) {
        console.error('chatbot_umpan_balik gagal ditulis:', e);
      }
    });
  }

  return NextResponse.json({ ok: true });
}