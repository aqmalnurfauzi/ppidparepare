-- Migration: 20261006000002_phase2_database_foundation.sql
-- Description: Phase 2 Gate A Database Foundation
-- Execution: Run directly via Supabase Dashboard SQL Editor

-- 1. Create permohonan_counter table
CREATE TABLE IF NOT EXISTS public.permohonan_counter (
    year INT PRIMARY KEY CHECK (year >= 2000 AND year <= 2100),
    nilai_terakhir INT NOT NULL DEFAULT 0 CHECK (nilai_terakhir >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS and disallow direct client access
ALTER TABLE public.permohonan_counter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Disallow client access to counter" ON public.permohonan_counter;
CREATE POLICY "Disallow client access to counter" ON public.permohonan_counter FOR ALL USING (false);

-- 2. Create allocate_nomor_permohonan function
CREATE OR REPLACE FUNCTION public.allocate_nomor_permohonan(p_year INT)
RETURNS TEXT AS $$
DECLARE
    v_current_val INT;
    v_next_val INT;
    v_formatted_no TEXT;
BEGIN
    IF p_year IS NULL OR p_year < 2000 OR p_year > 2100 THEN
        RAISE EXCEPTION 'Invalid year provided for allocate_nomor_permohonan: %', p_year;
    END IF;

    -- Ensure row exists for the year
    INSERT INTO public.permohonan_counter (year, nilai_terakhir, updated_at)
    VALUES (p_year, 0, NOW())
    ON CONFLICT (year) DO NOTHING;

    -- Concurrency-safe row-level lock
    SELECT nilai_terakhir INTO v_current_val
    FROM public.permohonan_counter
    WHERE year = p_year
    FOR UPDATE;

    v_next_val := v_current_val + 1;

    UPDATE public.permohonan_counter
    SET nilai_terakhir = v_next_val,
        updated_at = NOW()
    WHERE year = p_year;

    v_formatted_no := 'PPID-' || p_year::TEXT || '-' || LPAD(v_next_val::TEXT, 5, '0');
    RETURN v_formatted_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

-- Revoke execute from public/anon/authenticated to satisfy DB-10
REVOKE ALL ON FUNCTION public.allocate_nomor_permohonan(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_nomor_permohonan(INT) FROM anon;
REVOKE ALL ON FUNCTION public.allocate_nomor_permohonan(INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_nomor_permohonan(INT) TO service_role;

-- 3. Create permohonan table
CREATE TABLE IF NOT EXISTS public.permohonan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_permohonan TEXT UNIQUE,
    pemohon_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status_proses TEXT NOT NULL DEFAULT 'diajukan' CHECK (status_proses IN ('diajukan', 'diproses', 'selesai')),
    decision TEXT CHECK (decision IN ('dikabulkan_sepenuhnya', 'dikabulkan_sebagian', 'ditolak', 'tidak_dikuasai')),
    alasan_penolakan TEXT,
    tracking_token_hash TEXT,
    kategori_pemohon TEXT,
    nik TEXT,
    nama_pemohon TEXT NOT NULL,
    instansi TEXT,
    alamat TEXT,
    telepon TEXT,
    email TEXT,
    kebutuhan TEXT NOT NULL,
    tujuan_penggunaan TEXT,
    cara_memperoleh_informasi TEXT,
    cara_mendapatkan_salinan TEXT,
    catatan_internal TEXT,
    p_tiket_id TEXT, -- Legacy compatibility (nullable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints for permohonan State Machine & Invariants
DO $$ 
BEGIN
    -- Invariant 1 & 2: status_proses vs decision
    ALTER TABLE public.permohonan ADD CONSTRAINT chk_permohonan_status_decision 
        CHECK ((status_proses <> 'selesai' AND decision IS NULL) OR (status_proses = 'selesai' AND decision IS NOT NULL));
    
    -- Invariant 3 & 4: decision ditolak vs alasan_penolakan
    ALTER TABLE public.permohonan ADD CONSTRAINT chk_permohonan_decision_alasan 
        CHECK (
            (decision = 'ditolak' AND alasan_penolakan IS NOT NULL AND btrim(alasan_penolakan) <> '') OR 
            (decision IS DISTINCT FROM 'ditolak' AND alasan_penolakan IS NULL)
        );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Trigger to guard State Machine transitions, immutability, and updated_at
CREATE OR REPLACE FUNCTION public.guard_permohonan_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent direct transition from 'diajukan' to 'selesai'
    IF OLD.status_proses = 'diajukan' AND NEW.status_proses = 'selesai' THEN
        RAISE EXCEPTION 'Status transition violation: cannot transition directly from diajukan to selesai (must transition to diproses first)';
    END IF;

    -- Ensure nomor_permohonan cannot be modified once set
    IF OLD.nomor_permohonan IS NOT NULL AND NEW.nomor_permohonan IS DISTINCT FROM OLD.nomor_permohonan THEN
        RAISE EXCEPTION 'nomor_permohonan is immutable once assigned';
    END IF;

    -- Ensure pemohon_id cannot be changed (ownership immutability)
    IF OLD.pemohon_id <> NEW.pemohon_id THEN
        RAISE EXCEPTION 'pemohon_id is immutable: ownership of permohonan cannot be transferred';
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

DROP TRIGGER IF EXISTS trg_guard_permohonan_state_machine ON public.permohonan;
CREATE TRIGGER trg_guard_permohonan_state_machine
    BEFORE UPDATE ON public.permohonan
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_permohonan_state_machine();

-- Trigger for updated_at on insert
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

DROP TRIGGER IF EXISTS trg_set_updated_at_permohonan ON public.permohonan;
CREATE TRIGGER trg_set_updated_at_permohonan
    BEFORE INSERT ON public.permohonan
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS on permohonan
ALTER TABLE public.permohonan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own permohonan or admin read all" ON public.permohonan;
CREATE POLICY "Users can read own permohonan or admin read all" ON public.permohonan
    FOR SELECT USING (
        (pemohon_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)) OR public.is_admin()
    );
DROP POLICY IF EXISTS "Users can insert own permohonan or admin insert" ON public.permohonan;
CREATE POLICY "Users can insert own permohonan or admin insert" ON public.permohonan
    FOR INSERT WITH CHECK (
        (pemohon_id = auth.uid() AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)) OR public.is_admin()
    );
DROP POLICY IF EXISTS "Users can update own diajukan permohonan or admin update" ON public.permohonan;
CREATE POLICY "Users can update own diajukan permohonan or admin update" ON public.permohonan
    FOR UPDATE USING (
        (pemohon_id = auth.uid() AND status_proses = 'diajukan' AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)) OR public.is_admin()
    );
DROP POLICY IF EXISTS "Disallow direct permohonan delete" ON public.permohonan;
CREATE POLICY "Disallow direct permohonan delete" ON public.permohonan FOR DELETE USING (false);

-- Indexes for permohonan
CREATE INDEX IF NOT EXISTS idx_permohonan_pemohon_id ON public.permohonan(pemohon_id);
CREATE INDEX IF NOT EXISTS idx_permohonan_status_proses ON public.permohonan(status_proses);
CREATE UNIQUE INDEX IF NOT EXISTS uq_permohonan_tracking_token_hash ON public.permohonan(tracking_token_hash) WHERE tracking_token_hash IS NOT NULL;


-- 4. Create keberatan table
CREATE TABLE IF NOT EXISTS public.keberatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permohonan_id UUID NOT NULL REFERENCES public.permohonan(id) ON DELETE RESTRICT,
    nomor_keberatan TEXT UNIQUE,
    alasan_keberatan TEXT NOT NULL CHECK (btrim(alasan_keberatan) <> ''),
    kasus_posisi TEXT,
    status_keberatan TEXT NOT NULL DEFAULT 'diajukan' CHECK (status_keberatan IN ('diajukan', 'diproses', 'selesai')),
    tanggapan_atasan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for keberatan updated_at
DROP TRIGGER IF EXISTS trg_set_updated_at_keberatan ON public.keberatan;
CREATE TRIGGER trg_set_updated_at_keberatan
    BEFORE UPDATE ON public.keberatan
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on keberatan
ALTER TABLE public.keberatan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own keberatan or admin read all" ON public.keberatan;
CREATE POLICY "Users can read own keberatan or admin read all" ON public.keberatan
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.permohonan p 
            WHERE p.id = keberatan.permohonan_id 
              AND p.pemohon_id = auth.uid() 
              AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)
        ) OR public.is_admin()
    );
DROP POLICY IF EXISTS "Users can insert own keberatan or admin insert" ON public.keberatan;
CREATE POLICY "Users can insert own keberatan or admin insert" ON public.keberatan
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.permohonan p 
            WHERE p.id = keberatan.permohonan_id 
              AND p.pemohon_id = auth.uid() 
              AND p.status_proses = 'selesai' -- Usually you can only object after finished
              AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)
        ) OR public.is_admin()
    );
DROP POLICY IF EXISTS "Only admin can update keberatan" ON public.keberatan;
CREATE POLICY "Only admin can update keberatan" ON public.keberatan FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "Disallow direct keberatan delete" ON public.keberatan;
CREATE POLICY "Disallow direct keberatan delete" ON public.keberatan FOR DELETE USING (false);

-- Indexes for keberatan
CREATE INDEX IF NOT EXISTS idx_keberatan_permohonan_id ON public.keberatan(permohonan_id);
CREATE INDEX IF NOT EXISTS idx_keberatan_status_keberatan ON public.keberatan(status_keberatan);


-- 5. Create dokumen_permohonan table
CREATE TABLE IF NOT EXISTS public.dokumen_permohonan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permohonan_id UUID NOT NULL REFERENCES public.permohonan(id) ON DELETE RESTRICT,
    kategori_dokumen TEXT NOT NULL CHECK (kategori_dokumen IN ('identitas_ktp', 'surat_kuasa', 'akta_organisasi', 'dokumen_pendukung', 'bukti_penerimaan', 'dokumen_jawaban')),
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on dokumen_permohonan
ALTER TABLE public.dokumen_permohonan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own dokumen or admin read all" ON public.dokumen_permohonan;
CREATE POLICY "Users can read own dokumen or admin read all" ON public.dokumen_permohonan
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.permohonan p 
            WHERE p.id = dokumen_permohonan.permohonan_id 
              AND p.pemohon_id = auth.uid() 
              AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)
        ) OR public.is_admin()
    );
DROP POLICY IF EXISTS "Users can insert own dokumen or admin insert" ON public.dokumen_permohonan;
CREATE POLICY "Users can insert own dokumen or admin insert" ON public.dokumen_permohonan
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.permohonan p 
            WHERE p.id = dokumen_permohonan.permohonan_id 
              AND p.pemohon_id = auth.uid() 
              AND EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = auth.uid() AND up.is_active = true)
        ) OR public.is_admin()
    );
DROP POLICY IF EXISTS "Only admin can update dokumen" ON public.dokumen_permohonan;
CREATE POLICY "Only admin can update dokumen" ON public.dokumen_permohonan FOR UPDATE USING (public.is_admin());
DROP POLICY IF EXISTS "Disallow direct dokumen delete" ON public.dokumen_permohonan;
CREATE POLICY "Disallow direct dokumen delete" ON public.dokumen_permohonan FOR DELETE USING (false);

-- Indexes for dokumen_permohonan
CREATE INDEX IF NOT EXISTS idx_dokumen_permohonan_permohonan_id ON public.dokumen_permohonan(permohonan_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_permohonan_kategori ON public.dokumen_permohonan(kategori_dokumen);


-- 6. Create log_aktivitas table
CREATE TABLE IF NOT EXISTS public.log_aktivitas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'admin', 'system')),
    action TEXT NOT NULL CHECK (btrim(action) <> ''),
    target_entity TEXT NOT NULL CHECK (btrim(target_entity) <> ''),
    target_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on log_aktivitas
ALTER TABLE public.log_aktivitas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only admin can read log" ON public.log_aktivitas;
CREATE POLICY "Only admin can read log" ON public.log_aktivitas FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Disallow direct client insert to log" ON public.log_aktivitas;
CREATE POLICY "Disallow direct client insert to log" ON public.log_aktivitas FOR INSERT WITH CHECK (false); -- Inserted via service_role/trigger
DROP POLICY IF EXISTS "Disallow log update" ON public.log_aktivitas;
CREATE POLICY "Disallow log update" ON public.log_aktivitas FOR UPDATE USING (false);
DROP POLICY IF EXISTS "Disallow log delete" ON public.log_aktivitas;
CREATE POLICY "Disallow log delete" ON public.log_aktivitas FOR DELETE USING (false);

-- Indexes for log_aktivitas
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_actor_id ON public.log_aktivitas(actor_id);
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_target ON public.log_aktivitas(target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_created_at ON public.log_aktivitas(created_at DESC);

-- 7. GRANTS for general service role operations
GRANT SELECT, INSERT, UPDATE ON public.permohonan TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permohonan TO service_role;
GRANT SELECT, INSERT ON public.dokumen_permohonan TO authenticated;
GRANT ALL ON public.dokumen_permohonan TO service_role;
GRANT SELECT, INSERT ON public.keberatan TO authenticated;
GRANT ALL ON public.keberatan TO service_role;
GRANT SELECT ON public.log_aktivitas TO authenticated;
GRANT ALL ON public.log_aktivitas TO service_role;
GRANT ALL ON public.permohonan_counter TO service_role;
