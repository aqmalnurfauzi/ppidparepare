// lib/rate-limit.ts
// Pembatas permintaan sederhana per kunci (mis. "chat:<ip>"), disimpan di memori server.
// Di hosting serverless tiap instance punya memori sendiri, jadi ini hanya pengaman dasar.
const JENDELA_MS = 60_000;
const hits = new Map<string, number[]>();

export function terlaluBanyak(kunci: string, batas = 15): boolean {
  const now = Date.now();
  const recent = (hits.get(kunci) ?? []).filter((t) => now - t < JENDELA_MS);
  recent.push(now);
  hits.set(kunci, recent);
  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (v.every((t) => now - t >= JENDELA_MS)) hits.delete(k);
    });
  }
  return recent.length > batas;
}

export function ambilIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'tak-dikenal';
}