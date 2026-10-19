-- Script: bootstrap_genesis_admin.sql
-- Description: Out-of-band Genesis Admin provisioning procedure.
-- Execution: Run directly via Supabase Dashboard SQL Editor or administrative CLI.
-- NEVER expose this as an HTTP route or store cleartext credentials in this file.

DO $$
DECLARE
  v_target_email TEXT := 'REPLACE_WITH_GENESIS_ADMIN_EMAIL@pareparekota.go.id'; -- Ganti dengan email admin yang telah mendaftar
  v_user_id UUID;
BEGIN
  -- 1. Cari user di auth.users berdasarkan email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_target_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User dengan email % belum terdaftar di auth.users. Daftarkan akun terlebih dahulu sebelum promosi.', v_target_email;
  END IF;

  -- 2. Update role menjadi admin di public.user_profiles
  UPDATE public.user_profiles
  SET 
    role = 'admin',
    is_active = true,
    updated_at = NOW()
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    -- Fallback jika profil belum terbuat oleh trigger
    INSERT INTO public.user_profiles (id, role, is_active, full_name, created_at, updated_at)
    VALUES (v_user_id, 'admin', true, 'Genesis Administrator', NOW(), NOW());
  END IF;

  RAISE NOTICE 'Genesis Admin (%) berhasil dipromosikan dengan ID: %', v_target_email, v_user_id;
END $$;
