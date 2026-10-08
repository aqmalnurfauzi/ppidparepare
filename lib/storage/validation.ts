/**
 * Document Storage Validation & Magic Bytes Detection
 * Phase 2 — Gate B Private Document Security Foundation
 *
 * Security Requirements:
 * 1. Max 10 MB per file.
 * 2. Allowed formats: PDF, JPG/JPEG, PNG.
 * 3. Never trust client-supplied filename or Content-Type header alone.
 * 4. Verify binary magic bytes at byte offset 0.
 * 5. Reject executable binaries, shell scripts, and active HTML content.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes (10 MB)

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;

export const ALLOWED_USER_CATEGORIES = [
  'identitas_ktp',
  'surat_kuasa',
  'akta_organisasi',
  'dokumen_pendukung',
] as const;

export const ALLOWED_ADMIN_CATEGORIES = [
  'bukti_penerimaan',
  'dokumen_jawaban',
] as const;

export const ALL_DOCUMENT_CATEGORIES = [
  ...ALLOWED_USER_CATEGORIES,
  ...ALLOWED_ADMIN_CATEGORIES,
] as const;

export type DocumentCategory = (typeof ALL_DOCUMENT_CATEGORIES)[number];
export type UserDocumentCategory = (typeof ALLOWED_USER_CATEGORIES)[number];
export type AdminDocumentCategory = (typeof ALLOWED_ADMIN_CATEGORIES)[number];

export interface FileValidationResult {
  valid: boolean;
  detectedMime?: AllowedMimeType;
  sanitizedFilename?: string;
  error?: string;
}

/**
 * Detect actual MIME type using binary signature (magic bytes).
 *
 * Signatures:
 * - PDF: 25 50 44 46 2D (%PDF-)
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 */
export function detectMagicBytes(bytes: Uint8Array): AllowedMimeType | null {
  if (bytes.length < 4) return null;

  // Check PDF (%PDF-)
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // Check PNG (\x89PNG\r\n\x1a\n)
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // Check JPEG (FF D8 FF)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  return null;
}

/**
 * Checks for dangerous executable signatures (MZ, ELF, shell shebang, HTML/script tags)
 */
export function containsDangerousSignatures(bytes: Uint8Array): boolean {
  if (bytes.length < 2) return false;

  // Windows PE/DOS executable: MZ (4D 5A)
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) return true;

  // Linux ELF executable: \x7fELF (7F 45 4C 46)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x7f &&
    bytes[1] === 0x45 &&
    bytes[2] === 0x4c &&
    bytes[3] === 0x46
  ) {
    return true;
  }

  // Shell script shebang: #! (23 21)
  if (bytes[0] === 0x23 && bytes[1] === 0x21) return true;

  // Inspect first 1KB for embedded HTML or PHP tags
  const headerSlice = bytes.subarray(0, Math.min(1024, bytes.length));
  const headerStr = new TextDecoder('utf-8', { fatal: false }).decode(headerSlice).toLowerCase();

  if (
    headerStr.includes('<?php') ||
    headerStr.includes('<script') ||
    headerStr.includes('<!doctype html') ||
    headerStr.includes('<html')
  ) {
    return true;
  }

  return false;
}

/**
 * Sanitizes original filename to prevent path traversal or injection.
 */
export function sanitizeFilename(filename: string): string {
  // Strip path segments
  const basename = filename.replace(/^.*[/\\]/, '').trim();
  // Replace non-alphanumeric chars (except . and - and _)
  const clean = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Prevent multiple consecutive dots or leading dot
  const safe = clean.replace(/^\.+/, '').replace(/\.{2,}/g, '.');
  return safe.slice(0, 100) || 'dokumen';
}

/**
 * Comprehensive server-side document file validation.
 */
export function validateDocumentFile(params: {
  buffer: Uint8Array;
  originalFilename: string;
  declaredMimeType?: string;
}): FileValidationResult {
  const { buffer, originalFilename, declaredMimeType } = params;

  // 1. File size checks
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File kosong atau tidak terbaca.' };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Ukuran file (${(buffer.length / 1024 / 1024).toFixed(2)} MB) melebihi batas maksimal 10 MB.`,
    };
  }

  // 2. Filename and extension checks
  const sanitized = sanitizeFilename(originalFilename);
  const extMatch = sanitized.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!extMatch) {
    return { valid: false, error: 'File tidak memiliki ekstensi yang valid.' };
  }

  const ext = `.${extMatch[1]}`;
  if (!ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])) {
    return {
      valid: false,
      error: `Ekstensi "${ext}" tidak diizinkan. Hanya file PDF, JPG, JPEG, atau PNG yang diperbolehkan.`,
    };
  }

  // 3. Dangerous signatures check
  if (containsDangerousSignatures(buffer)) {
    return {
      valid: false,
      error: 'File ditolak: terdeteksi format berbahaya atau skrip yang tidak diizinkan.',
    };
  }

  // 4. Magic bytes detection
  const detectedMime = detectMagicBytes(buffer);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'Format file tidak sesuai dengan konten aslinya (magic bytes tidak valid).',
    };
  }

  // 5. Cross-check extension vs detected MIME
  if (detectedMime === 'application/pdf' && ext !== '.pdf') {
    return {
      valid: false,
      error: 'Ekstensi file tidak sesuai dengan konten PDF yang terdeteksi.',
    };
  }

  if (detectedMime === 'image/jpeg' && ext !== '.jpg' && ext !== '.jpeg') {
    return {
      valid: false,
      error: 'Ekstensi file tidak sesuai dengan konten JPEG yang terdeteksi.',
    };
  }

  if (detectedMime === 'image/png' && ext !== '.png') {
    return {
      valid: false,
      error: 'Ekstensi file tidak sesuai dengan konten PNG yang terdeteksi.',
    };
  }

  // 6. Cross-check declared MIME if provided
  if (declaredMimeType) {
    const normDeclared = declaredMimeType.toLowerCase().trim();
    if (
      normDeclared !== detectedMime &&
      !(normDeclared === 'image/jpg' && detectedMime === 'image/jpeg')
    ) {
      return {
        valid: false,
        error: `Tipe MIME yang dilaporkan (${declaredMimeType}) tidak sesuai dengan konten biner yang terdeteksi (${detectedMime}).`,
      };
    }
  }

  return {
    valid: true,
    detectedMime,
    sanitizedFilename: sanitized,
  };
}
