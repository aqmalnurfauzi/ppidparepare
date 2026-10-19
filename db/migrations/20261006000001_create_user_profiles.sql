-- Migration: 20261006000001_create_user_profiles.sql
-- Description: Phase 1 Authentication & User Profiles Schema

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  full_name TEXT,
  phone_number TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now()
);

-- Index for role and active status
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);

-- 2. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

DROP TRIGGER IF EXISTS on_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER on_user_profiles_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Trigger for automatic profile creation on user signup
-- Enforces default role='user' and is_active=true; completely ignores client-supplied roles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, is_active, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    'user',
    true,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    pg_catalog.now(),
    pg_catalog.now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Guard against unauthorized privilege escalation, self-demotion, self-deactivation, and last-admin removal
CREATE OR REPLACE FUNCTION public.guard_user_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_is_admin BOOLEAN := false;
  v_active_admin_count INT;
BEGIN
  -- Prevent changing immutable columns: id or created_at
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'ID cannot be modified.';
  END IF;
  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'created_at cannot be modified.';
  END IF;

  -- Check if role or is_active is modified
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    -- Check if execution is from service_role
    BEGIN
      v_caller_role := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
      v_caller_role := '';
    END;

    IF v_caller_role = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Check if current authenticated user is an active admin
    SELECT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    ) INTO v_caller_is_admin;

    IF NOT v_caller_is_admin THEN
      RAISE EXCEPTION 'Unauthorized: Only active administrators can modify role or account status.';
    END IF;

    -- Prevent self-demotion or self-deactivation by admin
    IF auth.uid() = OLD.id AND (NEW.role <> 'admin' OR NEW.is_active = false) THEN
      RAISE EXCEPTION 'Admins cannot demote or deactivate their own account.';
    END IF;

    -- Last-active-admin protection: If demoting or deactivating an admin, ensure at least one other active admin remains
    IF OLD.role = 'admin' AND OLD.is_active = true AND (NEW.role <> 'admin' OR NEW.is_active = false) THEN
      SELECT COUNT(*) INTO v_active_admin_count
      FROM public.user_profiles
      WHERE role = 'admin' AND is_active = true AND id <> OLD.id;

      IF v_active_admin_count = 0 THEN
        RAISE EXCEPTION 'Cannot demote or deactivate the last active administrator.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

DROP TRIGGER IF EXISTS trg_guard_user_profile_updates ON public.user_profiles;
CREATE TRIGGER trg_guard_user_profile_updates
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_profile_updates();

-- 5. Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

-- SELECT: Users can read own profile; Admins can read all profiles (prevents IDOR)
DROP POLICY IF EXISTS "Users can read own profile or admin can read all" ON public.user_profiles;
CREATE POLICY "Users can read own profile or admin can read all"
  ON public.user_profiles
  FOR SELECT
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- INSERT: Prevent manual direct insert from client; only trigger (SECURITY DEFINER) or service_role can insert
DROP POLICY IF EXISTS "Disallow direct manual profile insert" ON public.user_profiles;
CREATE POLICY "Disallow direct manual profile insert"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (false);

-- UPDATE: Users can update own profile (role/is_active protected by trigger); Admins can update profiles
DROP POLICY IF EXISTS "Users can update own profile or admin can update" ON public.user_profiles;
CREATE POLICY "Users can update own profile or admin can update"
  ON public.user_profiles
  FOR UPDATE
  USING (
    (auth.uid() = id AND is_active = true) OR public.is_admin()
  )
  WITH CHECK (
    (auth.uid() = id AND is_active = true) OR public.is_admin()
  );

-- DELETE: Disallow direct deletion; handled via cascade from auth.users
DROP POLICY IF EXISTS "Disallow direct profile delete" ON public.user_profiles;
CREATE POLICY "Disallow direct profile delete"
  ON public.user_profiles
  FOR DELETE
  USING (false);
