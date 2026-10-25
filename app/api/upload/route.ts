import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin, AuthError } from '@/lib/auth/session';

const ALLOWED_BUCKETS = ['berita'] as const;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const requestedBucket = (formData.get('bucket') as string) || 'berita';

    if (!ALLOWED_BUCKETS.includes(requestedBucket as any)) {
      return NextResponse.json(
        { error: `Bucket '${requestedBucket}' tidak diizinkan untuk unggahan ini.` },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diunggah.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file melebihi batas maksimum 5MB.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan format JPEG, PNG, atau WebP.' },
        { status: 400 }
      );
    }

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${Date.now()}_${cleanFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(requestedBucket)
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Server upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(requestedBucket)
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (err: any) {
    if (err instanceof AuthError) {
      const status = err.code === 'FORBIDDEN' ? 403 : 401;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error('Server upload exception:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan pada server saat unggah file.' },
      { status: 500 }
    );
  }
}

