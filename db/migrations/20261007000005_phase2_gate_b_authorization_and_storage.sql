-- Migration: 20261007000005_phase2_gate_b_authorization_and_storage.sql
-- Description: Phase 2 Gate B — Private Storage & Document Authorization Foundation
-- Depends on: 20261006000002_phase2_database_foundation.sql, 20261006000003_phase2_gate_a_authz_corrections.sql
-- Execution: Run directly via Supabase Dashboard SQL Editor (as postgres / table owner)
--
-- SECURITY ARCHITECTURE:
--   * Bucket 'permohonan-dokumen' is STRICTLY PRIVATE (public = false).
--   * Direct client upload/update/delete and SELECT to 'permohonan-dokumen' are quarantined via AS RESTRICTIVE policies.
--   * Direct client INSERT to public.dokumen_permohonan is REVOKED; uploads are mediated via server action.
--   * Document quota enforced at database level:
--       - KTP: exactly 1 file maximum per permohonan (enforced via partial unique index).
--       - Supporting documents: 5 files maximum per permohonan (enforced via BEFORE trigger with parent row lock).
--       - File size: max 10MB (enforced via table check constraint & bucket limits).
--   * Admin categories (bukti_penerimaan, dokumen_jawaban) are strictly blocked from normal users.
--   * Immutable identity columns (permohonan_id, storage_path) cannot be mutated.
--   * Concurrency serialization: parent row in public.permohonan is locked FOR NO KEY UPDATE during quota checks.

-- =====================================================================
-- 1. STORAGE BUCKET: Private Bucket Foundation & Restrictive Policies
-- =====================================================================

DO $$
BEGIN
    -- Ensure permohonan-dokumen bucket exists and is private
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'permohonan-dokumen',
        'permohonan-dokumen',
        false,
        10485760, -- 10 MB in bytes
        ARRAY['application/pdf', 'image/jpeg', 'image/png']
    )
    ON CONFLICT (id) DO UPDATE SET
        public = false,
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png'];

    -- Catatan Kompatibilitas Bucket Dokumen Publik:
    -- Bucket 'dokumen' digunakan oleh modul Informasi Publik (DIP, regulasi, laporan tahunan)
    -- dan harus tetap publik agar tautan unduhan publik masyarakat (informasi_publik.link_download)
    -- tidak rusak. Seluruh dokumen privat pemohon (KTP, berkas pendukung) dikarantina secara
    -- terisolasi di bucket baru 'permohonan-dokumen' di bawah ini.
EXCEPTION
    WHEN undefined_table THEN
        -- In environments where storage.buckets is not directly accessible via DDL
        NULL;
END $$;

-- Storage object policies for permohonan-dokumen
-- Gunakan AS RESTRICTIVE agar penolakan direct client mutasi dievaluasi dengan AND
-- terhadap semua policy permissive lain pada storage.objects, menjamin zero bypass.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Disallow direct client upload to permohonan-dokumen" ON storage.objects;
    CREATE POLICY "Disallow direct client upload to permohonan-dokumen"
        ON storage.objects AS RESTRICTIVE FOR INSERT
        WITH CHECK (
            bucket_id <> 'permohonan-dokumen' OR
            auth.role() = 'service_role' OR
            current_user IN ('service_role', 'supabase_storage_admin', 'postgres')
        );

    DROP POLICY IF EXISTS "Disallow direct client update to permohonan-dokumen" ON storage.objects;
    CREATE POLICY "Disallow direct client update to permohonan-dokumen"
        ON storage.objects AS RESTRICTIVE FOR UPDATE
        USING (
            bucket_id <> 'permohonan-dokumen' OR
            auth.role() = 'service_role' OR
            current_user IN ('service_role', 'supabase_storage_admin', 'postgres')
        );

    DROP POLICY IF EXISTS "Disallow direct client delete to permohonan-dokumen" ON storage.objects;
    CREATE POLICY "Disallow direct client delete to permohonan-dokumen"
        ON storage.objects AS RESTRICTIVE FOR DELETE
        USING (
            bucket_id <> 'permohonan-dokumen' OR
            auth.role() = 'service_role' OR
            current_user IN ('service_role', 'supabase_storage_admin', 'postgres')
        );

    -- Restrictive SELECT: Menjamin pembacaan objek pada bucket permohonan-dokumen HANYA
    -- diizinkan jika pemanggil adalah service_role, admin, atau pemilik dokumen yang sah.
    -- Kondisi bucket_id <> 'permohonan-dokumen' menjamin bucket lain tidak terpengaruh.
    DROP POLICY IF EXISTS "Restrict read access to permohonan-dokumen" ON storage.objects;
    CREATE POLICY "Restrict read access to permohonan-dokumen"
        ON storage.objects AS RESTRICTIVE FOR SELECT
        USING (
            bucket_id <> 'permohonan-dokumen' OR
            (
                auth.role() = 'service_role' OR
                current_user IN ('service_role', 'supabase_storage_admin', 'postgres') OR
                public.is_admin() OR
                (
                    auth.uid() IS NOT NULL AND
                    EXISTS (
                        SELECT 1 FROM public.dokumen_permohonan dp
                        JOIN public.permohonan p ON p.id = dp.permohonan_id
                        WHERE dp.storage_path = storage.objects.name
                          AND p.pemohon_id = auth.uid()
                          AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)
                    )
                )
            )
        );

    -- Permissive SELECT: Gateway pembuka izin baca untuk service_role, admin, dan pemilik sah.
    -- (Diperlukan karena PostgreSQL RLS mensyaratkan minimal satu permissive policy bernilai TRUE).
    DROP POLICY IF EXISTS "Users can read own permohonan storage objects or admin read all" ON storage.objects;
    CREATE POLICY "Users can read own permohonan storage objects or admin read all"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'permohonan-dokumen' AND (
                auth.role() = 'service_role' OR
                current_user IN ('service_role', 'supabase_storage_admin', 'postgres') OR
                public.is_admin() OR
                EXISTS (
                    SELECT 1 FROM public.dokumen_permohonan dp
                    JOIN public.permohonan p ON p.id = dp.permohonan_id
                    WHERE dp.storage_path = storage.objects.name
                      AND p.pemohon_id = auth.uid()
                      AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)
                )
            )
        );
EXCEPTION
    WHEN undefined_table THEN
        NULL;
END $$;

-- =====================================================================
-- 2. DOKUMEN PERMOHONAN: Quota & Integrity Constraints
-- =====================================================================

-- Enforce exactly max 1 KTP document per permohonan via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS uq_dokumen_ktp_per_permohonan 
    ON public.dokumen_permohonan(permohonan_id) 
    WHERE (kategori_dokumen = 'identitas_ktp');

-- Function to check document quotas and administrative role constraints
CREATE OR REPLACE FUNCTION public.check_dokumen_quota_and_role()
RETURNS TRIGGER AS $$
DECLARE
    v_supporting_count INT;
    v_is_adm BOOLEAN;
    v_caller_role TEXT := '';
    v_jwt_claims JSONB;
BEGIN
    -- 1. Robust caller role detection (PostgREST 9+ claims, auth.role(), request.jwt.claim.role)
    BEGIN
        v_jwt_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
        IF v_jwt_claims IS NOT NULL THEN
            v_caller_role := COALESCE(v_jwt_claims->>'role', '');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_caller_role := '';
    END;

    IF v_caller_role = '' THEN
        BEGIN
            v_caller_role := COALESCE(auth.role(), '');
        EXCEPTION WHEN OTHERS THEN
            v_caller_role := '';
        END;
    END IF;

    IF v_caller_role = '' THEN
        BEGIN
            v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
        EXCEPTION WHEN OTHERS THEN
            v_caller_role := '';
        END;
    END IF;

    IF v_caller_role = '' THEN
        IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
            v_caller_role := current_user;
        END IF;
    END IF;

    -- Evaluasi izin admin:
    -- Diizinkan jika dipanggil via service_role (backend Server Action yang telah memvalidasi sesi admin),
    -- ATAU jika sesi pemanggil (auth.uid()) memiliki profil admin aktif via public.is_admin().
    v_is_adm := (v_caller_role = 'service_role') OR public.is_admin();

    -- Invariant 1: Admin-only categories cannot be inserted by standard users
    IF NEW.kategori_dokumen IN ('bukti_penerimaan', 'dokumen_jawaban') AND NOT v_is_adm THEN
        RAISE EXCEPTION 'Kategori dokumen "%" hanya dapat diunggah oleh administrator', NEW.kategori_dokumen
            USING ERRCODE = '42501';
    END IF;

    -- Invariant 2: KTP is guarded by partial unique index uq_dokumen_ktp_per_permohonan

    -- Invariant 3: Supporting documents count cannot exceed 5 per permohonan
    -- Berlaku untuk SEMUA pemanggil (termasuk service_role dan admin).
    -- Serialisasi concurrency: Kunci baris induk permohonan dengan FOR NO KEY UPDATE
    -- untuk mencegah race condition (phantom insert) jika ada request upload bersamaan.
    IF NEW.kategori_dokumen IN ('surat_kuasa', 'akta_organisasi', 'dokumen_pendukung') THEN
        PERFORM 1 FROM public.permohonan WHERE id = NEW.permohonan_id FOR NO KEY UPDATE;

        SELECT COUNT(*) INTO v_supporting_count
        FROM public.dokumen_permohonan
        WHERE permohonan_id = NEW.permohonan_id
          AND kategori_dokumen IN ('surat_kuasa', 'akta_organisasi', 'dokumen_pendukung')
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

        IF v_supporting_count >= 5 THEN
            RAISE EXCEPTION 'Batas kuota dokumen pendukung terlampaui: maksimal 5 dokumen pendukung per permohonan'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

DROP TRIGGER IF EXISTS trg_check_dokumen_quota ON public.dokumen_permohonan;
CREATE TRIGGER trg_check_dokumen_quota
    BEFORE INSERT OR UPDATE ON public.dokumen_permohonan
    FOR EACH ROW
    EXECUTE FUNCTION public.check_dokumen_quota_and_role();

-- =====================================================================
-- 3. IMMUTABILITY TRIGGER: Guard against tampering with document identity
-- =====================================================================

CREATE OR REPLACE FUNCTION public.guard_dokumen_immutable_columns()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.permohonan_id <> OLD.permohonan_id THEN
        RAISE EXCEPTION 'permohonan_id pada dokumen_permohonan bersifat immutable'
            USING ERRCODE = '42501';
    END IF;
    IF NEW.storage_path <> OLD.storage_path THEN
        RAISE EXCEPTION 'storage_path pada dokumen_permohonan bersifat immutable'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

DROP TRIGGER IF EXISTS trg_guard_dokumen_immutable ON public.dokumen_permohonan;
CREATE TRIGGER trg_guard_dokumen_immutable
    BEFORE UPDATE ON public.dokumen_permohonan
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_dokumen_immutable_columns();

-- =====================================================================
-- 4. PRIVILEGES: Restrict direct client writes
-- =====================================================================

-- Drop policy insert lama dari 000002 jika ada, karena semua upload dimediasi server-side
DROP POLICY IF EXISTS "Users can insert own dokumen or admin insert" ON public.dokumen_permohonan;

-- Revoke seluruh mutasi langsung (INSERT, UPDATE, DELETE, TRUNCATE) dari client roles
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.dokumen_permohonan FROM anon, authenticated;
GRANT SELECT ON public.dokumen_permohonan TO authenticated;
GRANT ALL ON public.dokumen_permohonan TO service_role;
