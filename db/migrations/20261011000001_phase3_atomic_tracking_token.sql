-- Migration: 20261011000001_phase3_atomic_tracking_token.sql
-- Description: Phase 3 Workstream 1 — Atomic tracking_token_hash support in create_permohonan
-- Depends on: 20261006000003_phase2_gate_a_authz_corrections.sql
-- Execution: Run directly via Supabase Dashboard SQL Editor (as postgres / table owner)

-- 1. Drop legacy 11-argument overload to prevent function overloading ambiguity in PostgreSQL
DROP FUNCTION IF EXISTS public.create_permohonan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 2. Create updated 12-argument function
CREATE OR REPLACE FUNCTION public.create_permohonan(
    p_nama_pemohon TEXT,
    p_kebutuhan TEXT,
    p_kategori_pemohon TEXT DEFAULT NULL,
    p_nik TEXT DEFAULT NULL,
    p_instansi TEXT DEFAULT NULL,
    p_alamat TEXT DEFAULT NULL,
    p_telepon TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_tujuan_penggunaan TEXT DEFAULT NULL,
    p_cara_memperoleh_informasi TEXT DEFAULT NULL,
    p_cara_mendapatkan_salinan TEXT DEFAULT NULL,
    p_tracking_token_hash TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, nomor_permohonan TEXT) AS $$
#variable_conflict use_column
DECLARE
    v_uid UUID;
    v_year INT;
    v_nomor TEXT;
    v_id UUID;
BEGIN
    -- (1) Authorization BEFORE any privileged operation
    v_uid := public._authorize_caller('user');

    -- (2) Input validation
    IF p_nama_pemohon IS NULL OR btrim(p_nama_pemohon) = '' THEN
        RAISE EXCEPTION 'nama_pemohon is required' USING ERRCODE = '22023';
    END IF;
    IF p_kebutuhan IS NULL OR btrim(p_kebutuhan) = '' THEN
        RAISE EXCEPTION 'kebutuhan is required' USING ERRCODE = '22023';
    END IF;

    -- (3) Allocation (row lock on counter, same transaction)
    v_year := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Makassar'))::INT;
    v_nomor := public.allocate_nomor_permohonan(v_year);

    -- (4) Validate format of tracking_token_hash if provided (executed after allocation to enforce atomic rollback semantics)
    IF p_tracking_token_hash IS NOT NULL AND p_tracking_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'Invalid tracking_token_hash format: must be 64-character lowercase hex string'
            USING ERRCODE = '22023';
    END IF;

    -- (5) INSERT — workflow columns forced to defaults; p_tiket_id never set (LEGACY ONLY)
    INSERT INTO public.permohonan AS p (
        nomor_permohonan, pemohon_id, status_proses, decision, alasan_penolakan,
        tracking_token_hash, catatan_internal,
        kategori_pemohon, nik, nama_pemohon, instansi, alamat, telepon, email,
        kebutuhan, tujuan_penggunaan, cara_memperoleh_informasi, cara_mendapatkan_salinan
    ) VALUES (
        v_nomor, v_uid, 'diajukan', NULL, NULL,
        p_tracking_token_hash, NULL,
        p_kategori_pemohon, p_nik, btrim(p_nama_pemohon), p_instansi, p_alamat, p_telepon, p_email,
        btrim(p_kebutuhan), p_tujuan_penggunaan, p_cara_memperoleh_informasi, p_cara_mendapatkan_salinan
    )
    RETURNING p.id INTO v_id;

    -- (6) Audit (same transaction: any failure rolls back counter + insert + audit)
    INSERT INTO public.log_aktivitas (actor_id, actor_role, action, target_entity, target_id, metadata)
    VALUES (v_uid, 'user', 'permohonan.create', 'permohonan', v_id::TEXT,
            jsonb_build_object(
                'nomor_permohonan', v_nomor,
                'has_tracking_token', (p_tracking_token_hash IS NOT NULL)
            ));

    id := v_id;
    nomor_permohonan := v_nomor;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

-- 3. Privilege revocation and grants
REVOKE ALL ON FUNCTION public.create_permohonan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_permohonan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_permohonan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
    'Phase 3: Atomically creates permohonan with optional tracking_token_hash, sequential numbering, and audit logging.';
