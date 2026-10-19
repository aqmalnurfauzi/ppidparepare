-- Migration: 20261006000004_fix_profile_guard_service_role.sql
-- Description: Fix service_role detection in guard_user_profile_updates trigger
-- Depends on: 20261006000001_create_user_profiles.sql
-- Execution: Run via Supabase Dashboard SQL Editor (as postgres / table owner)
--
-- RATIONALE:
--   PostgREST 9+ (and current Supabase instances) supplies JWT claims as a JSON string
--   in `request.jwt.claims` (plural), and does not expose individual `request.jwt.claim.<key>` GUCs.
--   The original Phase 1 trigger only read `request.jwt.claim.role`, causing service_role REST calls
--   (such as server-side inviteAdmin, toggleUserStatus, and test fixtures) to evaluate to NULL
--   and fail with: "Unauthorized: Only active administrators can modify role or account status."
--
-- SECURITY INVARIANTS PRESERVED:
--   - SECURITY DEFINER with fixed search_path = pg_catalog, public, pg_temp
--   - Immutable id and created_at columns strictly protected against modification
--   - anon and authenticated regular users: completely DENIED from mutating role or is_active
--   - Admin self-demotion: completely DENIED
--   - Admin self-deactivation: completely DENIED
--   - Last active admin protection: completely DENIED (applies universally to all actors)
--   - service_role: ALLOWED for controlled server-side provisioning and status mutation

CREATE OR REPLACE FUNCTION public.guard_user_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  v_caller_role TEXT := '';
  v_caller_is_admin BOOLEAN := false;
  v_active_admin_count INT;
  v_jwt_claims JSONB;
BEGIN
  -- 1. Prevent changing immutable columns: id or created_at (applies to all callers)
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'ID cannot be modified.';
  END IF;
  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'created_at cannot be modified.';
  END IF;

  -- 2. Check if role or is_active is modified
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN

    -- Robust service_role detection across Supabase & PostgREST runtime versions:
    -- A. Parse JSON from request.jwt.claims (PostgREST 9+ standard)
    BEGIN
      v_jwt_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
      IF v_jwt_claims IS NOT NULL THEN
        v_caller_role := COALESCE(v_jwt_claims->>'role', '');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_caller_role := '';
    END;

    -- B. Fallback to auth.role() helper if not found
    IF v_caller_role = '' THEN
      BEGIN
        v_caller_role := COALESCE(auth.role(), '');
      EXCEPTION WHEN OTHERS THEN
        v_caller_role := '';
      END;
    END IF;

    -- C. Fallback to legacy request.jwt.claim.role (PostgREST < 9)
    IF v_caller_role = '' THEN
      BEGIN
        v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
      EXCEPTION WHEN OTHERS THEN
        v_caller_role := '';
      END;
    END IF;

    -- 3. Universal Last-Active-Admin Protection:
    -- If demoting or deactivating an active admin, at least one other active admin must remain.
    -- This protection applies universally to all actors (including service_role and peer admins).
    IF OLD.role = 'admin' AND OLD.is_active = true AND (NEW.role <> 'admin' OR NEW.is_active = false) THEN
      SELECT COUNT(*) INTO v_active_admin_count
      FROM public.user_profiles
      WHERE role = 'admin' AND is_active = true AND id <> OLD.id;

      IF v_active_admin_count = 0 THEN
        RAISE EXCEPTION 'Cannot demote or deactivate the last active administrator.';
      END IF;
    END IF;

    -- 4. Authorized service_role bypass for server-side provisioning/status updates
    IF v_caller_role = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- 5. Standard actor authorization: caller must be an active administrator
    SELECT EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin' AND is_active = true
    ) INTO v_caller_is_admin;

    IF NOT v_caller_is_admin THEN
      RAISE EXCEPTION 'Unauthorized: Only active administrators can modify role or account status.';
    END IF;

    -- 6. Prevent self-demotion or self-deactivation by admin
    IF auth.uid() = OLD.id AND (NEW.role <> 'admin' OR NEW.is_active = false) THEN
      RAISE EXCEPTION 'Admins cannot demote or deactivate their own account.';
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp;

COMMENT ON FUNCTION public.guard_user_profile_updates() IS
  'Protects user_profiles against unauthorized role/is_active mutation with robust service_role detection, last-admin protection, and self-demotion prevention.';
