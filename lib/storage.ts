import { supabase } from './supabase';

/**
 * Kompresi gambar client-side menggunakan HTML5 Canvas
 * Mengurangi ukuran file dari 5-10 MB menjadi ~150-300 KB tanpa kehilangan kualitas visual yang signifikan
 */
export async function compressImage(
  file: File, 
  maxWidth = 1600, 
  maxHeight = 1200, 
  quality = 0.82
): Promise<{ file: File; base64: string }> {
  // Hanya lakukan kompresi jika di browser dan file bertipe gambar
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    const base64 = await fileToBase64(file);
    return { file, base64 };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Hitung aspect ratio jika melebihi batas maksimal
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = height;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          fileToBase64(file).then(base64 => resolve({ file, base64 })).catch(reject);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert ke Blob dan Base64
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              fileToBase64(file).then(base64 => resolve({ file, base64 })).catch(reject);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve({ file: compressedFile, base64: compressedBase64 });
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Upload file ke Supabase Storage dengan 2-Tier Fallback (Direct -> Server Route -> Compressed Base64)
 * @param file Objek File dari browser
 * @param bucket Nama bucket Supabase ('berita' atau 'dokumen')
 * @returns { url, error, isBase64Fallback }
 */
export async function uploadToSupabaseStorage(
  file: File, 
  bucket: 'berita' | 'dokumen'
): Promise<{ url: string | null; error: string | null; isBase64Fallback?: boolean }> {
  try {
    let uploadFile = file;
    let fallbackBase64 = '';

    // 1. Optimasi gambar jika bertipe image
    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file);
        uploadFile = compressed.file;
        fallbackBase64 = compressed.base64;
      } catch (compErr) {
        console.warn('Image compression skipped/failed:', compErr);
      }
    }

    const cleanFileName = uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${Date.now()}_${cleanFileName}`;

    // 2. Coba Tier 1: Direct Client Upload ke Supabase
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          return { url: publicUrlData.publicUrl, error: null };
        }
      }
    } catch (clientErr) {
      console.warn('Tier 1 Direct Client Upload failed, trying Tier 2 Server Upload...', clientErr);
    }

    // 3. Coba Tier 2: Server Route Upload (/api/upload)
    try {
      const fd = new FormData();
      fd.append('file', uploadFile);
      fd.append('bucket', bucket);

      const serverRes = await fetch('/api/upload', {
        method: 'POST',
        body: fd
      });

      if (serverRes.ok) {
        const resJson = await serverRes.json();
        if (resJson.url) {
          return { url: resJson.url, error: null };
        }
      }
    } catch (serverErr) {
      console.warn('Tier 2 Server Upload failed:', serverErr);
    }

    // 4. Tier 3: Fallback ke Base64 yang sudah dikompresi (sangat ringan ~150KB)
    if (fallbackBase64) {
      return { 
        url: fallbackBase64, 
        error: null, 
        isBase64Fallback: true 
      };
    }

    // Fallback darurat jika bukan gambar
    const rawBase64 = await fileToBase64(file);
    return { url: rawBase64, error: null, isBase64Fallback: true };

  } catch (err: any) {
    console.error('Upload exception:', err);
    return { url: null, error: err.message || 'Terjadi kesalahan saat mengunggah file.' };
  }
}

/**
 * Helper untuk mengonversi gambar menjadi Base64 Data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
