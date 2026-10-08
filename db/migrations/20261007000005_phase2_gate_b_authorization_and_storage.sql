-- Migration: 20261007000005_phase2_gate_b_authorization_and_storage.sql
-- Description: Phase 2 Gate B — Private Storage & Document Authorization Foundation
-- Depends on: 20261006000002_phase2_database_foundation.sql, 20261006000003_phase2_gate_a_authz_corrections.sql
-- Execution: Run directly via Supabase Dashboard SQL Editor (as postgres / table owner)
--
-- SECURITY ARCHITECTURE:
--   * Bucket 'permohonan-dokumen' is STRICTLY PRIVATE (public = false).
--   * Document quota enforced at database level:
--       - KTP: exactly 1 file maximum per permohonan (enforced via partial unique index).
--       - Supporting documents: 5 files maximum per permohonan (enforced via BEFORE trigger).
--       - File size: max 10MB (enforced via table check constraint & bucket limits).
--   * Admin categories (bukti_penerimaan, dokumen_jawaban) are strictly blocked from normal users.
--   * Immutable identity columns (permohonan_id, storage_path) cannot be mutated.
--   * Direct client storage mutation is disallowed; uploads go through server-side validation.

-- =====================================================================
-- 1. STORAGE BUCKET: Private Bucket Foundation
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

    -- Restrict legacy public bucket 'dokumen' if present to prevent public leakage
    UPDATE storage.buckets
    SET public = false
    WHERE id = 'dokumen';
EXCEPTION
    WHEN undefined_table THEN
        -- In environments where storage.buckets is not directly accessible via DDL
        NULL;
END $$;

-- Storage object policies for permohonan-dokumen
DO $$
BEGIN
    DROP POLICY IF EXISTS "Disallow direct client upload to permohonan-dokumen" ON storage.objects;
    CREATE POLICY "Disallow direct client upload to permohonan-dokumen"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id <> 'permohonan-dokumen' OR false);

    DROP POLICY IF EXISTS "Disallow direct client update to permohonan-dokumen" ON storage.objects;
    CREATE POLICY "Disallow direct client update to permohonan-dokumen"
        ON storage.objects FOR UPDATE
        USING (bucket_id <> 'permohonan-dokumen' OR false);

    DROP POLICY IF EXISTS "Disallow direct client delete to permohonan-dokumen" ON storage.objects;
    CREATE POLICY "Disallow direct client delete to permohonan-dokumen"
        ON storage.objects FOR DELETE
        USING (bucket_id <> 'permohonan-dokumen' OR false);

    DROP POLICY IF EXISTS "Users can read own permohonan storage objects or admin read all" ON storage.objects;
    CREATE POLICY "Users can read own permohonan storage objects or admin read all"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'permohonan-dokumen' AND (
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
BEGIN
    v_is_adm := public.is_admin();

    -- Invariant 1: Admin-only categories cannot be inserted by standard users
    IF NEW.kategori_dokumen IN ('bukti_penerimaan', 'dokumen_jawaban') AND NOT v_is_adm THEN
        RAISE EXCEPTION 'Kategori dokumen "%" hanya dapat diunggah oleh administrator', NEW.kategori_dokumen
            USING ERRCODE = '42501';
    END IF;

    -- Invariant 2: KTP is guarded by partial unique index uq_dokumen_ktp_per_permohonan

    -- Invariant 3: Supporting documents count cannot exceed 5 per permohonan
    IF NEW.kategori_dokumen IN ('surat_kuasa', 'akta_organisasi', 'dokumen_pendukung') THEN
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

REVOKE UPDATE, DELETE, TRUNCATE ON public.dokumen_permohonan FROM anon, authenticated;
GRANT SELECT ON public.dokumen_permohonan TO authenticated;
GRANT ALL ON public.dokumen_permohonan TO service_role;
