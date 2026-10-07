# Phase 2 Gate A — Authorization & Numbering Model

Status: **corrections implemented locally, NOT yet accepted** (staging execution pending).
Migration: `db/migrations/20261006000003_phase2_gate_a_authz_corrections.sql`

## 1. Final design: SECURITY DEFINER RPC (not service-role server code)

Creating a permohonan goes through **one** RPC, `public.create_permohonan(...)`, called
with the **user's own JWT** (anon key + session). The application server never uses
`service_role` to create a permohonan.

Why RPC rather than service-role server code:
- Authorization, number allocation, INSERT, and audit all run in **one Postgres transaction**
  (one function call), so a failure at any step rolls back everything, including the counter.
- Authorization is enforced **in the database**. A bug in the app layer can't skip it,
  and there's no privileged credential that can stand in for authorization.

## 2. Authorization model for `public.permohonan`

| Layer | anon | authenticated (user/admin) | service_role |
|---|---|---|---|
| Table GRANT | none | `SELECT` only | full (backend infra / ops only) |
| RLS | — | SELECT own (active) or admin; INSERT/UPDATE/DELETE policies = `false` | bypass |
| Trigger `trg_a_guard_permohonan_direct_client_write` | reject | reject any direct INSERT/UPDATE/DELETE | allowed |
| State-machine trigger | — | — | immutability of `nomor_permohonan`, `pemohon_id`, `tracking_token_hash`; no `diajukan→selesai`; `selesai` is terminal |
| CHECK constraints | status/decision/alasan invariants |||

No direct client write is possible: it's blocked three times (GRANT, RLS, trigger).
Workflow mutations happen only through:

- `create_permohonan(...)` (role `user`): workflow columns are forced to defaults
  (`status_proses='diajukan'`; `decision`, `alasan_penolakan`, `tracking_token_hash`,
  `catatan_internal`, and `p_tiket_id` are NULL). `pemohon_id` is always `auth.uid()`.
  The function has no parameter for any privileged column.
- `admin_update_permohonan_workflow(...)` (role `admin`): locks the row, applies the change
  (CHECK constraints and the state-machine trigger still apply), and writes an audit row.

The trigger is `SECURITY INVOKER` and checks `current_user`. Inside a SECURITY DEFINER RPC,
`current_user` is the function owner, so RPC writes pass. A direct PostgREST call runs as
`authenticated`/`anon`, so it is rejected with error `42501`.

`keberatan`: authenticated may INSERT only `(permohonan_id, alasan_keberatan, kasus_posisi)`.
This is a column-level grant, so `status_keberatan`, `tanggapan_atasan`, and `nomor_keberatan`
can't be set by the client.

## 3. Numbering transaction model

```
client (user JWT) ── rpc create_permohonan ──▶ BEGIN (implicit, one statement)
  1. _authorize_caller('user')
       auth.uid() NOT NULL
       auth.users.email_confirmed_at NOT NULL
       user_profiles.is_active = true AND role = 'user'
     → on failure: RAISE 42501. Nothing has been allocated yet.
  2. validate input (nama_pemohon, kebutuhan non-empty)
  3. allocate_nomor_permohonan(year WITA)   -- SELECT ... FOR UPDATE on counter row
  4. INSERT permohonan (pemohon_id = auth.uid(), defaults for workflow columns)
  5. INSERT log_aktivitas ('permohonan.create')
COMMIT  ← any error in 1-5 rolls back counter + row + audit (no gaps, no orphans)
```

- `allocate_nomor_permohonan(INT)` has **no EXECUTE grant to any API role**, including
  `service_role`. It is internal only.
- `_authorize_caller(TEXT)` has no EXECUTE grant to any API role.
- `create_permohonan` and `admin_update_permohonan_workflow` have EXECUTE only for
  `authenticated`. It is revoked from `PUBLIC`, `anon`, and `service_role`.
  (A service-role JWT has `auth.uid() = NULL` and would fail authorization anyway.)
- Every SECURITY DEFINER function uses `SET search_path = pg_catalog, public, pg_temp`.
- Concurrency: the counter row lock serializes allocation per year. The UNIQUE constraint on
  `nomor_permohonan` is the backstop.

### Rules for future Server Actions / API (Gate B+)
- Call `supabase.rpc('create_permohonan', ...)` with the **request-scoped user client**
  (cookie session). Never use the service-role client for this.
- Calling `getUser()` first and showing a clear error is good UX, but the RPC is the
  authoritative authorization check.
- Never send `pemohon_id`, status, decision, nomor, or token from the client. The RPC
  doesn't accept them.

## 4. LEGACY `p_tiket_id`

**LEGACY ONLY.** It is kept only for compatibility with migrated legacy rows. It must NOT be
used by new UI, Server Actions, API, authorization, numbering, or tracking.
`create_permohonan` never sets it. It will be removed in **Legacy Cleanup**.
(This is also recorded as a `COMMENT ON COLUMN`.)

## 5. Document quota

Enforced in the database (kept from 000002):
- `file_size_bytes` ≤ 10 MB (10 485 760) per file
- MIME allowlist: `application/pdf`, `image/jpeg`, `image/png`

To be enforced **server-side in the application/backend layer** (Gate B upload flow), and
**never by the client alone**:
- `identitas_ktp`: max **1** per permohonan
- `dokumen_pendukung`: max **5** per permohonan

## 6. Known remaining risks (to close before or at Gate B)
- `authenticated` has table-level SELECT. The owner can therefore read `catatan_internal` and
  `tracking_token_hash` of their own rows. Recommended fix: column-level SELECT grant, or a
  view/RPC for the owner.
- `dokumen_permohonan` INSERT by the owner allows admin-only categories
  (`dokumen_jawaban`, `bukti_penerimaan`), and quotas are not enforced in the DB yet.
- `service_role` keeps full table access by design (ops). Application code must not use it
  for permohonan create/workflow.
- `guard_user_profile_updates` (Phase 1) detects service_role via the legacy
  `request.jwt.claim.role` setting. If staging's PostgREST only sets `request.jwt.claims`, the
  test fixtures that deactivate or promote profiles will fail. That would be a Phase 1 defect,
  not a Gate A one.

## 7. Acceptance commands

```bash
# 1. Apply 000002 then 000003 on staging (SQL Editor).
# 2. Strict test run: skips become failures
GATE_A_STRICT=1 node --test --experimental-strip-types \
  tests/phase2-gate-a-database.test.ts tests/phase2-gate-a-authz.test.ts
# 3. Inspect privileges
#   SELECT grantee, privilege_type FROM information_schema.role_table_grants
#    WHERE table_schema='public' AND table_name='permohonan';
#   SELECT p.proname, r.rolname, has_function_privilege(r.oid, p.oid, 'EXECUTE')
#     FROM pg_proc p CROSS JOIN pg_roles r
#    WHERE p.pronamespace='public'::regnamespace
#      AND p.proname IN ('allocate_nomor_permohonan','create_permohonan','admin_update_permohonan_workflow','_authorize_caller')
#      AND r.rolname IN ('anon','authenticated','service_role');
npm run typecheck
npm run build
```
