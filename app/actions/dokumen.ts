'use server';

import { requireAuth, requireVerifiedUser, AuthError } from '@/lib/auth/session';
import {
  UploadDokumenInputSchema,
  DokumenIdSchema,
  PermohonanIdSchema,
} from '@/lib/validations/dokumen';
import {
  uploadDokumenPermohonan,
  getDokumenSignedUrl,
  listDokumenPermohonan,
  getPermohonanDokumenQuotaStatus,
} from '@/lib/storage/documents';
import {
  type DokumenDTO,
  type DokumenSignedUrlDTO,
  type DokumenQuotaStatusDTO,
} from '@/types/dokumen';
import { type DocumentCategory } from '@/lib/storage/validation';

export type DokumenActionErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_DISABLED'
  | 'FORBIDDEN'
  | 'QUOTA_EXCEEDED'
  | 'NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR';

export type DokumenActionSuccess<T> = {
  success: true;
  data: T;
};

export type DokumenActionFailure = {
  success: false;
  error: {
    code: DokumenActionErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type DokumenActionResult<T> = DokumenActionSuccess<T> | DokumenActionFailure;

/**
 * Normalizes document storage, database, and validation errors into sanitized user responses.
 * Strictly prevents leaking internal storage paths, table schemas, SQL syntax, or server traces.
 */
function mapDokumenError(err: unknown): {
  code: DokumenActionErrorCode;
  message: string;
} {
  if (err instanceof AuthError) {
    return {
      code: err.code as DokumenActionErrorCode,
      message: err.message,
    };
  }

  if (err instanceof Error) {
    const msg = err.message || '';

    // Not found errors
    if (msg.includes('tidak ditemukan')) {
      return {
        code: 'NOT_FOUND',
        message: msg,
      };
    }

    // Quota and constraint errors
    if (
      msg.includes('sudah memiliki dokumen KTP') ||
      msg.includes('Batas kuota dokumen pendukung terlampaui') ||
      msg.includes('uq_dokumen_ktp_per_permohonan') ||
      msg.includes('trg_check_dokumen_quota')
    ) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: msg.includes('KTP')
          ? 'Permohonan ini sudah memiliki dokumen KTP. Hanya 1 file KTP yang diperbolehkan.'
          : 'Batas kuota dokumen pendukung terlampaui: maksimal 5 dokumen pendukung per permohonan.',
      };
    }

    // Role restrictions
    if (msg.includes('hanya dapat diunggah oleh administrator') || msg.includes('tidak diizinkan untuk pemohon')) {
      return {
        code: 'FORBIDDEN',
        message: msg,
      };
    }

    // File validation errors
    if (msg.includes('Validasi file gagal') || msg.includes('magic bytes') || msg.includes('berbahaya')) {
      return {
        code: 'INVALID_FILE_TYPE',
        message: msg,
      };
    }

    if (msg.includes('melebihi batas maksimal 10 MB')) {
      return {
        code: 'FILE_TOO_LARGE',
        message: 'Ukuran file melebihi batas maksimal 10 MB.',
      };
    }

    // Storage bucket or RLS errors
    if (msg.includes('42501') || msg.toLowerCase().includes('permission denied')) {
      return {
        code: 'FORBIDDEN',
        message: 'Akses ditolak: Anda tidak memiliki izin untuk mengunggah dokumen pada permohonan ini.',
      };
    }
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'Terjadi kesalahan sistem saat memproses dokumen. Silakan coba beberapa saat lagi.',
  };
}

/**
 * Server Action: Secure Document Upload
 *
 * Security Enforcements:
 * 1. Requires verified active user session (applicant or admin).
 * 2. Strictly validates category allowlist and UUID parameters via Zod.
 * 3. Inspects binary magic bytes, file extension, and dangerous signatures.
 * 4. Stores file strictly in private bucket 'permohonan-dokumen'.
 * 5. Strictly protects storage_path confidentiality (never returned in DTO).
 * 6. Compensates and cleans up partial uploads on DB failures.
 * 7. Records audit trail in log_aktivitas.
 */
export async function uploadDokumenAction(
  input: FormData | { permohonanId: string; kategori: string; file: File }
): Promise<DokumenActionResult<DokumenDTO>> {
  try {
    // 1. Authenticate caller and verify active user status
    const { profile } = await requireAuth();

    // Applicants must have verified emails to upload sensitive documents
    if (profile.role !== 'admin') {
      await requireVerifiedUser();
    }

    // 2. Extract inputs from FormData or Object
    let file: File | null = null;
    let permohonanId: string | null = null;
    let kategori: string | null = null;

    if (typeof FormData !== 'undefined' && input instanceof FormData) {
      file = input.get('file') as File | null;
      permohonanId = input.get('permohonanId') as string | null;
      kategori = input.get('kategori') as string | null;
    } else if (input && typeof input === 'object') {
      const obj = input as Record<string, unknown>;
      file = (obj.file as File) ?? null;
      permohonanId = typeof obj.permohonanId === 'string' ? obj.permohonanId : null;
      kategori = typeof obj.kategori === 'string' ? obj.kategori : null;
    }

    if (!file) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File dokumen wajib diunggah.',
        },
      };
    }

    // 3. Validate parameters via Zod
    const parsed = UploadDokumenInputSchema.safeParse({
      permohonanId,
      kategori,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.') || 'root';
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data input upload dokumen tidak valid.',
          details: fieldErrors,
        },
      };
    }

    // 4. Convert File to binary buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // 5. Invoke Phase 2 storage domain engine
    const docDto = await uploadDokumenPermohonan({
      permohonanId: parsed.data.permohonanId,
      fileBuffer,
      originalFilename: file.name,
      declaredMimeType: file.type,
      kategori: parsed.data.kategori as DocumentCategory,
    });

    return {
      success: true,
      data: docDto,
    };
  } catch (err: unknown) {
    console.error('[SERVER ACTION ERROR] uploadDokumenAction failed:', err instanceof Error ? err.message : 'Unknown');
    return {
      success: false,
      error: mapDokumenError(err),
    };
  }
}

/**
 * Server Action: Ephemeral Signed URL Retrieval
 *
 * Security Enforcements:
 * 1. Requires authenticated active session.
 * 2. Enforces permohonan ownership (must own associated permohonan or be admin).
 * 3. Enforces 60-second short TTL (ephemeral access).
 * 4. Records access audit log in log_aktivitas.
 */
export async function getDokumenSignedUrlAction(
  dokumenId: string
): Promise<DokumenActionResult<DokumenSignedUrlDTO>> {
  try {
    const parsed = DokumenIdSchema.safeParse(dokumenId);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ID dokumen tidak valid.',
        },
      };
    }

    const result = await getDokumenSignedUrl(parsed.data);
    return {
      success: true,
      data: result,
    };
  } catch (err: unknown) {
    console.error('[SERVER ACTION ERROR] getDokumenSignedUrlAction failed:', err instanceof Error ? err.message : 'Unknown');
    return {
      success: false,
      error: mapDokumenError(err),
    };
  }
}

/**
 * Server Action: Safe Document Listing
 *
 * Security Enforcements:
 * 1. Requires authenticated active session.
 * 2. Enforces permohonan ownership.
 * 3. Uses safe projection (storage_path is NEVER included).
 */
export async function listDokumenAction(
  permohonanId: string
): Promise<DokumenActionResult<DokumenDTO[]>> {
  try {
    const parsed = PermohonanIdSchema.safeParse(permohonanId);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ID permohonan tidak valid.',
        },
      };
    }

    const docs = await listDokumenPermohonan(parsed.data);
    return {
      success: true,
      data: docs,
    };
  } catch (err: unknown) {
    console.error('[SERVER ACTION ERROR] listDokumenAction failed:', err instanceof Error ? err.message : 'Unknown');
    return {
      success: false,
      error: mapDokumenError(err),
    };
  }
}

/**
 * Server Action: Document Quota Status
 *
 * Provides safe quota summary for client UI before attempting upload.
 */
export async function getDokumenQuotaStatusAction(
  permohonanId: string
): Promise<DokumenActionResult<DokumenQuotaStatusDTO>> {
  try {
    const parsed = PermohonanIdSchema.safeParse(permohonanId);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'ID permohonan tidak valid.',
        },
      };
    }

    const status = await getPermohonanDokumenQuotaStatus(parsed.data);
    return {
      success: true,
      data: status,
    };
  } catch (err: unknown) {
    console.error('[SERVER ACTION ERROR] getDokumenQuotaStatusAction failed:', err instanceof Error ? err.message : 'Unknown');
    return {
      success: false,
      error: mapDokumenError(err),
    };
  }
}
