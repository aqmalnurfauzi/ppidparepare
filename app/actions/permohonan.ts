'use server';

import { requireVerifiedUser, AuthError } from '@/lib/auth/session';
import { CreatePermohonanInputSchema } from '@/lib/validations/permohonan';
import { generateTrackingToken, hashTrackingToken } from '@/lib/tracking/token';

export type CreatePermohonanErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_DISABLED'
  | 'FORBIDDEN'
  | 'RPC_ERROR'
  | 'INTERNAL_ERROR';

export type CreatePermohonanSuccess = {
  success: true;
  data: {
    id: string;
    nomor_permohonan: string;
    tracking_token: string;
  };
};

export type CreatePermohonanFailure = {
  success: false;
  error: {
    code: CreatePermohonanErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type CreatePermohonanResult = CreatePermohonanSuccess | CreatePermohonanFailure;

/**
 * Normalizes PostgreSQL / PostgREST errors into safe user-facing responses.
 * Strictly prevents leaking SQL syntax, table names, RPC names, or stack traces.
 */
function mapPostgreSqlError(error: { code?: string; message?: string }): {
  code: CreatePermohonanErrorCode;
  message: string;
} {
  switch (error.code) {
    case '42501':
      return {
        code: 'FORBIDDEN',
        message: 'Akses ditolak: Anda tidak memiliki izin untuk mengajukan permohonan informasi.',
      };
    case '22023':
      return {
        code: 'VALIDATION_ERROR',
        message: 'Data permohonan yang diberikan tidak valid atau tidak memenuhi format yang ditentukan.',
      };
    case '23505':
      return {
        code: 'RPC_ERROR',
        message: 'Terjadi konflik identitas tiket permohonan. Silakan coba kirim kembali.',
      };
    case 'P0002':
      return {
        code: 'RPC_ERROR',
        message: 'Data referensi permohonan tidak ditemukan.',
      };
    default:
      return {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem saat memproses permohonan Anda. Silakan coba beberapa saat lagi.',
      };
  }
}

/**
 * Server Action for authenticated applicant submission.
 *
 * Security & Atomicity Guarantees:
 * 1. Requires verified, active user session with role='user'.
 * 2. Generates CSPRNG tracking token & HMAC-SHA-256 hash in server memory.
 * 3. Invokes public.create_permohonan RPC carrying user JWT (NO service_role).
 * 4. Atomically persists hash, allocates sequential number, inserts row, and writes audit trail.
 * 5. Returns plaintext tracking token once to caller; never leaks hash or confidential fields.
 * 6. Sanitizes all database errors before returning to client.
 */
export async function createPermohonanAction(
  rawInput: unknown
): Promise<CreatePermohonanResult> {
  try {
    // 1. Authenticate caller and verify email status
    const { profile, supabase } = await requireVerifiedUser();

    // 2. Enforce role invariant (RPC strictly requires role 'user')
    if (profile.role !== 'user') {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Hanya akun pemohon (role "user") yang dapat mengajukan permohonan informasi.',
        },
      };
    }

    // 3. Validate input payload against strict Zod schema
    const parsed = CreatePermohonanInputSchema.safeParse(rawInput);
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
          message: 'Data permohonan yang diberikan tidak valid.',
          details: fieldErrors,
        },
      };
    }

    const input = parsed.data;

    // 4. Generate CSPRNG tracking token & HMAC-SHA-256 hash in server memory
    const trackingToken = generateTrackingToken();
    const trackingTokenHash = hashTrackingToken(trackingToken);

    // 5. Invoke atomic create_permohonan RPC using request-scoped user client
    const { data, error } = await supabase.rpc('create_permohonan', {
      p_nama_pemohon: input.nama_pemohon,
      p_kebutuhan: input.kebutuhan,
      p_kategori_pemohon: input.kategori_pemohon ?? null,
      p_nik: input.nik ?? null,
      p_instansi: input.instansi ?? null,
      p_alamat: input.alamat ?? null,
      p_telepon: input.telepon ?? null,
      p_email: input.email ?? null,
      p_tujuan_penggunaan: input.tujuan_penggunaan ?? null,
      p_cara_memperoleh_informasi: input.cara_memperoleh_informasi ?? null,
      p_cara_mendapatkan_salinan: input.cara_mendapatkan_salinan ?? null,
      p_tracking_token_hash: trackingTokenHash,
    });

    if (error) {
      // Safe server-side diagnostic logging (never log user PII or secrets)
      console.error('[SERVER ACTION ERROR] create_permohonan RPC failed:', {
        code: error.code,
        message: error.message,
      });

      const sanitized = mapPostgreSqlError(error);
      return {
        success: false,
        error: sanitized,
      };
    }

    const result = Array.isArray(data) ? data[0] : data;
    if (!result || !result.id || !result.nomor_permohonan) {
      console.error('[SERVER ACTION ERROR] Invalid RPC response format:', result);
      return {
        success: false,
        error: {
          code: 'RPC_ERROR',
          message: 'Respon pembuatan permohonan tidak valid dari database.',
        },
      };
    }

    return {
      success: true,
      data: {
        id: result.id,
        nomor_permohonan: result.nomor_permohonan,
        tracking_token: trackingToken,
      },
    };
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return {
        success: false,
        error: {
          code: err.code as CreatePermohonanErrorCode,
          message: err.message,
        },
      };
    }

    // Unexpected internal server error
    console.error('[SERVER ACTION UNEXPECTED ERROR]:', err instanceof Error ? err.name : 'Unknown');
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem saat memproses permohonan Anda. Silakan coba beberapa saat lagi.',
      },
    };
  }
}
