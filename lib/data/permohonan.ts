import 'server-only';

import { requireAuth, requireAdmin } from '@/lib/auth/session';
import {
  PermohonanIdSchema,
  PermohonanListQuerySchema,
  type PermohonanListQuery,
} from '@/lib/validations/permohonan';
import {
  PERMOHONAN_USER_PROJECTION,
  PERMOHONAN_ADMIN_PROJECTION,
  type PermohonanUserDTO,
  type PermohonanAdminDTO,
} from '@/types/permohonan';

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Retrieve paginated list of permohonan owned by current authenticated user.
 *
 * Security Guarantees:
 * 1. Enforces requireAuth() session & active user status.
 * 2. Strictly filters by `pemohon_id = user.id` (database + RLS defense-in-depth).
 * 3. Never selects `catatan_internal` or `tracking_token_hash`.
 * 4. Never uses `SELECT *`.
 */
export async function getUserPermohonanList(
  params?: unknown
): Promise<PaginatedResult<PermohonanUserDTO>> {
  const { user, supabase } = await requireAuth();
  const query: PermohonanListQuery = PermohonanListQuerySchema.parse(params ?? {});

  const offset = (query.page - 1) * query.limit;
  const to = offset + query.limit - 1;

  let builder = supabase
    .from('permohonan')
    .select(PERMOHONAN_USER_PROJECTION, { count: 'exact' })
    .eq('pemohon_id', user.id);

  if (query.status) {
    builder = builder.eq('status_proses', query.status);
  }

  if (query.search) {
    const term = query.search;
    builder = builder.or(`nomor_permohonan.ilike.%${term}%,kebutuhan.ilike.%${term}%`);
  }

  builder = builder
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range(offset, to);

  const { data, count, error } = await builder;

  if (error) {
    throw new Error(`Gagal mengambil daftar permohonan: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as unknown as PermohonanUserDTO[],
    count: total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
}

/**
 * Retrieve detail of a specific permohonan owned by current authenticated user.
 *
 * Security Guarantees:
 * 1. Enforces requireAuth() session & active user status.
 * 2. Strictly filters by BOTH `id = validId` AND `pemohon_id = user.id`.
 * 3. Never selects `catatan_internal` or `tracking_token_hash`.
 * 4. Never uses `SELECT *`.
 */
export async function getUserPermohonanDetail(
  id: unknown
): Promise<PermohonanUserDTO | null> {
  const validId = PermohonanIdSchema.parse(id);
  const { user, supabase } = await requireAuth();

  const { data, error } = await supabase
    .from('permohonan')
    .select(PERMOHONAN_USER_PROJECTION)
    .eq('id', validId)
    .eq('pemohon_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengambil detail permohonan: ${error.message}`);
  }

  return (data as unknown as PermohonanUserDTO) ?? null;
}

/**
 * Retrieve paginated list of all permohonan for administrators.
 *
 * Security Guarantees:
 * 1. Enforces requireAdmin() active admin session.
 * 2. Uses explicit PERMOHONAN_ADMIN_PROJECTION (includes catatan_internal, excludes tracking_token_hash).
 * 3. Never uses `SELECT *`.
 */
export async function getAdminPermohonanList(
  params?: unknown
): Promise<PaginatedResult<PermohonanAdminDTO>> {
  const { supabase } = await requireAdmin();
  const query: PermohonanListQuery = PermohonanListQuerySchema.parse(params ?? {});

  const offset = (query.page - 1) * query.limit;
  const to = offset + query.limit - 1;

  let builder = supabase
    .from('permohonan')
    .select(PERMOHONAN_ADMIN_PROJECTION, { count: 'exact' });

  if (query.status) {
    builder = builder.eq('status_proses', query.status);
  }

  if (query.search) {
    const term = query.search;
    builder = builder.or(`nomor_permohonan.ilike.%${term}%,nama_pemohon.ilike.%${term}%,kebutuhan.ilike.%${term}%`);
  }

  builder = builder
    .order(query.sortBy, { ascending: query.sortOrder === 'asc' })
    .range(offset, to);

  const { data, count, error } = await builder;

  if (error) {
    throw new Error(`Gagal mengambil daftar permohonan admin: ${error.message}`);
  }

  const total = count ?? 0;

  return {
    data: (data ?? []) as unknown as PermohonanAdminDTO[],
    count: total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
}

/**
 * Retrieve detail of a specific permohonan for administrators.
 *
 * Security Guarantees:
 * 1. Enforces requireAdmin() active admin session.
 * 2. Uses explicit PERMOHONAN_ADMIN_PROJECTION.
 * 3. Never uses `SELECT *`.
 */
export async function getAdminPermohonanDetail(
  id: unknown
): Promise<PermohonanAdminDTO | null> {
  const validId = PermohonanIdSchema.parse(id);
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('permohonan')
    .select(PERMOHONAN_ADMIN_PROJECTION)
    .eq('id', validId)
    .maybeSingle();

  if (error) {
    throw new Error(`Gagal mengambil detail permohonan admin: ${error.message}`);
  }

  return (data as unknown as PermohonanAdminDTO) ?? null;
}
