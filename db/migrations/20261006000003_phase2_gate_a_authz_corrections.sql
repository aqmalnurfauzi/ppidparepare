-- Migration: 20261006000003_phase2_gate_a_authz_corrections.sql
-- Description: Phase 2 Gate A — Acceptance Review Corrections (BLOCKER 1 & 2)
-- Depends on: 20261006000001_create_user_profiles.sql, 20261006000002_phase2_database_foundation.sql
-- Execution: Run via Supabase Dashboard SQL Editor (as postgres / table owner)
--
-- FINAL DESIGN (see docs/phase2-gate-a-authorization.md):
--   * Clients (anon/authenticated) have NO direct INSERT/UPDATE/DELETE on public.permohonan.
--   * Permohonan creation = SECURITY DEFINER RPC public.create_permohonan(...)
--       auth.uid() + email verified + active 'user' profile
--       + nomor allocation + INSERT + audit  => ONE transaction (single RPC call).
--   * Admin workflow mutation = SECURITY DEFINER RPC public.admin_update_permohonan_workflow(...)
--       auth.uid() + email verified + active 'admin' profile + row lock + UPDATE + audit.
--   * service_role is NOT used for permohonan creation and cannot execute
--     allocate_nomor_permohonan (internal helper only).
--   * Defense-in-depth layers: (1) table GRANTs, (2) RLS, (3) BEFORE trigger that rejects
--     any direct write whose current_user is anon/authenticated.

-- =====================================================================
-- 1. PRIVILEGES: remove direct write paths for client roles
-- =====================================================================
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.permohonan FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.permohonan FROM anon;
GRANT SELECT ON public.permohonan TO authenticated;

-- keberatan: client may only supply its own content columns; workflow columns are admin/RPC-only.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.keberatan FROM PUBLIC, anon, authenticated;
GRANT INSERT (permohonan_id, alasan_keberatan, kasus_posisi) ON public.keberatan TO authenticated;

-- Counter is never client-visible.
REVOKE ALL ON public.permohonan_counter FROM PUBLIC, anon, authenticated;

-- =====================================================================
-- 2. RLS: remove direct INSERT/UPDATE policies for permohonan (SELECT stays)
-- =====================================================================
DROP POLICY IF EXISTS "Users can insert own permohonan or admin insert" ON public.permohonan;
DROP POLICY IF EXISTS "Users can update own diajukan permohonan or admin update" ON public.permohonan;

DROP POLICY IF EXISTS "Disallow direct permohonan insert" ON public.permohonan;
CREATE POLICY "Disallow direct permohonan insert" ON public.permohonan FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "Disallow direct permohonan update" ON public.permohonan;
CREATE POLICY "Disallow direct permohonan update" ON public.permohonan FOR UPDATE USING (false) WITH CHECK (false);

-- =====================================================================
-- 3. TRIGGER: reject direct client-role writes regardless of grants/RLS
--    SECURITY INVOKER on purpose: current_user is the *calling* role.
--    Inside SECURITY DEFINER RPCs current_user = function owner, so RPC writes pass.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.guard_permohonan_direct_client_write()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        RAISE EXCEPTION 'permohonan: direct % by client role is forbidden; use authorized RPC', TG_OP
            USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL ON FUNCTION public.guard_permohonan_direct_client_write() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_a_guard_permohonan_direct_client_write ON public.permohonan;
CREATE TRIGGER trg_a_guard_permohonan_direct_client_write
    BEFORE INSERT OR UPDATE OR DELETE ON public.permohonan
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_permohonan_direct_client_write();

-- State machine guard: add tracking_token_hash immutability + terminal 'selesai'.
CREATE OR REPLACE FUNCTION public.guard_permohonan_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status_proses = 'diajukan' AND NEW.status_proses = 'selesai' THEN
        RAISE EXCEPTION 'Status transition violation: cannot transition directly from diajukan to selesai (must transition to diproses first)';
    END IF;

    IF OLD.status_proses = 'selesai' AND NEW.status_proses IS DISTINCT FROM 'selesai' THEN
        RAISE EXCEPTION 'Status transition violation: selesai is terminal';
    END IF;

    IF OLD.nomor_permohonan IS NOT NULL AND NEW.nomor_permohonan IS DISTINCT FROM OLD.nomor_permohonan THEN
        RAISE EXCEPTION 'nomor_permohonan is immutable once assigned';
    END IF;

    IF OLD.pemohon_id <> NEW.pemohon_id THEN
        RAISE EXCEPTION 'pemohon_id is immutable: ownership of permohonan cannot be transferred';
    END IF;

    IF OLD.tracking_token_hash IS NOT NULL AND NEW.tracking_token_hash IS DISTINCT FROM OLD.tracking_token_hash THEN
        RAISE EXCEPTION 'tracking_token_hash is immutable once assigned';
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

-- =====================================================================
-- 4. allocate_nomor_permohonan: INTERNAL ONLY (no role may call it directly)
-- =====================================================================
REVOKE ALL ON FUNCTION public.allocate_nomor_permohonan(INT) FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON FUNCTION public.allocate_nomor_permohonan(INT) IS
    'INTERNAL ONLY. Called exclusively from create_permohonan() inside the same transaction. No EXECUTE grant to any API role.';

-- =====================================================================
-- 5. Shared caller-authorization helper (internal)
-- =====================================================================
CREATE OR REPLACE FUNCTION public._authorize_caller(p_required_role TEXT)
RETURNS UUID AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_confirmed TIMESTAMPTZ;
    v_role TEXT;
    v_active BOOLEAN;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT u.email_confirmed_at INTO v_confirmed FROM auth.users u WHERE u.id = v_uid;
    IF v_confirmed IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: email not verified' USING ERRCODE = '42501';
    END IF;

    SELECT up.role, up.is_active INTO v_role, v_active FROM public.user_profiles up WHERE up.id = v_uid;
    IF v_role IS NULL OR v_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized: profile missing or inactive' USING ERRCODE = '42501';
    END IF;
    IF v_role <> p_required_role THEN
        RAISE EXCEPTION 'Unauthorized: role % required', p_required_role USING ERRCODE = '42501';
    END IF;

    RETURN v_uid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL ON FUNCTION public._authorize_caller(TEXT) FROM PUBLIC, anon, authenticated, service_role;

-- =====================================================================
-- 6. create_permohonan: authorization + allocation + INSERT + audit (atomic)
--    pemohon_id is NOT a parameter: it is always auth.uid().
--    Workflow columns are NOT parameters: always server defaults.
-- =====================================================================
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
    p_cara_mendapatkan_salinan TEXT DEFAULT NULL
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

    -- (4) INSERT — workflow columns forced to defaults; p_tiket_id never set (LEGACY ONLY)
    INSERT INTO public.permohonan AS p (
        nomor_permohonan, pemohon_id, status_proses, decision, alasan_penolakan,
        tracking_token_hash, catatan_internal,
        kategori_pemohon, nik, nama_pemohon, instansi, alamat, telepon, email,
        kebutuhan, tujuan_penggunaan, cara_memperoleh_informasi, cara_mendapatkan_salinan
    ) VALUES (
        v_nomor, v_uid, 'diajukan', NULL, NULL,
        NULL, NULL,
        p_kategori_pemohon, p_nik, btrim(p_nama_pemohon), p_instansi, p_alamat, p_telepon, p_email,
        btrim(p_kebutuhan), p_tujuan_penggunaan, p_cara_memperoleh_informasi, p_cara_mendapatkan_salinan
    )
    RETURNING p.id INTO v_id;

    -- (5) Audit (same transaction: any failure rolls back counter + insert + audit)
    INSERT INTO public.log_aktivitas (actor_id, actor_role, action, target_entity, target_id, metadata)
    VALUES (v_uid, 'user', 'permohonan.create', 'permohonan', v_id::TEXT,
            jsonb_build_object('nomor_permohonan', v_nomor));

    id := v_id;
    nomor_permohonan := v_nomor;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL ON FUNCTION public.create_permohonan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_permohonan(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================================
-- 7. admin_update_permohonan_workflow: admin-only workflow mutation (atomic + audit)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_update_permohonan_workflow(
    p_permohonan_id UUID,
    p_status_proses TEXT,
    p_decision TEXT DEFAULT NULL,
    p_alasan_penolakan TEXT DEFAULT NULL,
    p_catatan_internal TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_uid UUID;
    v_old public.permohonan%ROWTYPE;
BEGIN
    v_uid := public._authorize_caller('admin');

    SELECT * INTO v_old FROM public.permohonan WHERE permohonan.id = p_permohonan_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'permohonan not found' USING ERRCODE = 'P0002';
    END IF;

    -- CHECK constraints + state-machine trigger enforce invariants.
    UPDATE public.permohonan
    SET status_proses = p_status_proses,
        decision = p_decision,
        alasan_penolakan = p_alasan_penolakan,
        catatan_internal = COALESCE(p_catatan_internal, v_old.catatan_internal)
    WHERE permohonan.id = p_permohonan_id;

    INSERT INTO public.log_aktivitas (actor_id, actor_role, action, target_entity, target_id, metadata)
    VALUES (v_uid, 'admin', 'permohonan.workflow_update', 'permohonan', p_permohonan_id::TEXT,
            jsonb_build_object(
                'from_status', v_old.status_proses, 'to_status', p_status_proses,
                'from_decision', v_old.decision, 'to_decision', p_decision));
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_update_permohonan_workflow(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_permohonan_workflow(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- =====================================================================
-- 8. LEGACY p_tiket_id
-- =====================================================================
COMMENT ON COLUMN public.permohonan.p_tiket_id IS
    'LEGACY ONLY — compatibility for migrated legacy rows. MUST NOT be used by new UI, Server Actions, API, authorization, numbering, or tracking. Scheduled for removal in Legacy Cleanup.';
