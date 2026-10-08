# Phase 2 Gate B — Authorization, Safe Data Access, Private Storage & Workflow Implementation

Status: **Implemented & Ready for Execution / Review**  
Branch: `phase-2-database-foundation`  
Migration: `db/migrations/20261007000005_phase2_gate_b_authorization_and_storage.sql`  

---

## 1. Overview & Objectives

Phase 2 Gate B extends the database security foundation established in Gate A to the application layer, storage buckets, tracking subsystem, workflow mutations, and objection lifecycle.

### Key Goals Achieved
1. **Zero Data Leaks (DTO Boundary):** Strict projections eliminate `SELECT *`, confidential notes (`catatan_internal`), internal storage paths, and cryptographic hashes (`tracking_token_hash`) from public and normal user payloads.
2. **Private Storage Foundation:** Bucket `permohonan-dokumen` is strictly private (`public = false`). Direct client mutation is blocked at the storage layer. Uploads are inspected server-side for magic bytes and virus/executable signatures. Downloads are mediated via ephemeral 60-second signed URLs.
3. **Cryptographically Secure Tracking:** Pure Base62 tokens (~43 characters from 256 bits of CSPRNG entropy). Tokens are hashed via HMAC-SHA-256 and verified using constant-time comparison with dummy branches to prevent timing side-channels.
4. **Workflow State Machine:** Intermediate statuses (`diajukan`, `diproses`) reject decisions; terminal status (`selesai`) strictly mandates decisions. Rejections enforce documented reasons. Mutations execute via row-locking RPCs with comprehensive audit trails in `log_aktivitas`.
5. **Keberatan (Objection) Authorization:** Column-level grants restrict client inserts to `(permohonan_id, alasan_keberatan, kasus_posisi)`. RLS ensures objections can only be filed against user-owned permohonan that have reached terminal status (`selesai`).
6. **Legacy Claim:** Authenticated and email-verified users can claim legacy records by matching exact tuples (`legacyId`, `nik`, `tanggal`). Brute-force attacks are thwarted by rate limiting (maximum 3 failed attempts per 15-minute window).

---

## 2. Architecture & Subsystem Breakdown

### Step 1: Type Contracts & Data Access Boundary
- **Files:** `types/permohonan.ts`, `lib/types/permohonan.ts`, `lib/validations/permohonan.ts`, `lib/data/permohonan.ts`.
- **Projections:** Explicit column projections (`PERMOHONAN_USER_PROJECTION` and `PERMOHONAN_ADMIN_PROJECTION`).
- **Guarantees:**
  - `FORBIDDEN_USER_COLUMNS` (`catatan_internal`, `tracking_token_hash`) are excluded by contract and type definitions.
  - Queries enforce `pemohon_id = user.id` at both application and RLS levels.
  - Applicant names in public tracking views are masked via `maskApplicantName` (e.g., `Ahmad Dahlan` $\rightarrow$ `A**** D*****`).

### Step 2: Private Storage & Document Quotas
- **Migration:** `20261007000005_phase2_gate_b_authorization_and_storage.sql`.
- **Files:** `lib/storage/validation.ts`, `types/dokumen.ts`, `lib/types/dokumen.ts`, `lib/storage/documents.ts`.
- **Quota & Categories:**
  - `identitas_ktp`: exactly 1 file maximum per permohonan (guarded by partial unique index `uq_dokumen_ktp_per_permohonan`).
  - Supporting documents (`surat_kuasa`, `akta_organisasi`, `dokumen_pendukung`): maximum 5 files per permohonan (guarded by trigger `trg_check_dokumen_quota`).
  - Admin categories (`bukti_penerimaan`, `dokumen_jawaban`): standard users cannot upload (trigger `trg_check_dokumen_quota`).
  - Immutability: `permohonan_id` and `storage_path` are locked by `trg_guard_dokumen_immutable`.
- **File Validation:**
  - Magic-byte detection (PDF `%PDF-`, JPEG `\xFF\xD8\xFF`, PNG `\x89PNG\r\n\x1a\n`).
  - Blocks Windows PE (`MZ`), Linux ELF, shell scripts (`#!`), and HTML/PHP scripts.
  - Size bounded to 10 MB maximum. Filenames sanitized against path traversal (`..`, slashes).
- **Signed URL Access:**
  - Ephemeral 60-second TTL (`SIGNED_URL_TTL_SECONDS = 60`).
  - `DokumenDTO` strictly excludes internal `storage_path`.

### Step 3: Tracking Token Subsystem
- **Files:** `lib/tracking/token.ts`, `lib/tracking/service.ts`.
- **Entropy & Encoding:**
  - 256 bits (32 bytes) CSPRNG from `crypto.randomBytes(32)`.
  - Pure Base62 encoding (`0-9A-Za-z`, length 62, zero underscores).
- **HMAC Verification:**
  - Secret-keyed HMAC-SHA-256 (64-character lowercase hex string).
  - Constant-time verification using `crypto.timingSafeEqual`.
  - When candidate record is not found or has null hash, a precomputed dummy HMAC is evaluated in constant time before returning `false`.
- **Reissue:**
  - Requires authenticated owner or admin session.
  - Overwrites `tracking_token_hash` atomically and audits in `log_aktivitas`.

### Step 4: Workflow State Machine & Admin Mutations
- **Files:** `lib/validations/workflow.ts`, `lib/workflow/admin.ts`.
- **Invariants:**
  1. `status_proses` $\in$ `['diajukan', 'diproses', 'selesai']`.
  2. `status_proses === 'selesai'` $\iff$ `decision` is non-null.
  3. `status_proses !== 'selesai'` $\iff$ `decision` is null/omitted.
  4. `decision === 'ditolak'` $\iff$ `alasan_penolakan` is non-empty string.
  5. `decision !== 'ditolak'` $\iff$ `alasan_penolakan` is null/empty.
- **Database Enforcement:**
  - Direct skip from `diajukan` to `selesai` blocked by `guard_permohonan_state_machine()`.
  - `selesai` is strictly terminal at the database level.
  - Mutation executed via SECURITY DEFINER RPC `admin_update_permohonan_workflow(...)` using `FOR UPDATE` row lock.

### Step 5: Keberatan (Objection) Subsystem
- **Files:** `types/keberatan.ts`, `lib/types/keberatan.ts`, `lib/validations/keberatan.ts`, `lib/data/keberatan.ts`.
- **Authorization & Invariants:**
  - Authenticated users have column-level GRANT on `(permohonan_id, alasan_keberatan, kasus_posisi)`.
  - User can only file objection for owned permohonan where `status_proses === 'selesai'`.
  - Active duplicate objection prevention (cannot file second objection while one is open in `diajukan` or `diproses`).
  - Terminal objection status (`selesai`) strictly requires `tanggapan_atasan`.
  - All creations and workflow updates write audit events into `log_aktivitas`.

### Step 6: Legacy Claim Subsystem
- **Files:** `lib/validations/claim.ts`, `lib/legacy/rate-limit.ts`, `lib/legacy/claim.ts`.
- **Authorization & Anti-Hijacking:**
  - Caller must have active session with confirmed email (`requireAuth()`).
  - Candidate record matched on exact tuple: `(legacyId [p_tiket_id or nomor_permohonan], nik [16 digits], tanggal)`.
  - Anti-hijack: Candidate must have `pemohon_id IS NULL`.
  - Atomic link: `UPDATE permohonan SET pemohon_id = user.id WHERE id = candidate.id AND pemohon_id IS NULL`.
  - Rate limiting: Maximum 3 failed attempts per 15-minute window (`checkClaimRateLimit`). Resets to 0 upon successful claim.
  - Audit logging for `legacy_claim.success`, `legacy_claim.failed`, `legacy_claim.already_claimed`, and `legacy_claim.rate_limited`.

---

## 3. Defense-in-Depth Security Matrix

| Subsystem | Application Layer (Zod / TS) | Data Boundary / Service Layer | Database Layer (RLS / Grants / Triggers) |
|---|---|---|---|
| **Permohonan Data Access** | `PermohonanListQuerySchema`, `PermohonanIdSchema` | Server-only, caller session binding (`pemohon_id = user.id`), explicit projections | RLS ownership policies, `REVOKE` direct table writes |
| **Documents & Storage** | File size $\le$ 10MB, MIME allowlist, magic-byte check, dangerous signature block | Server-only, 60s signed URL TTL, quota calculation | Private bucket (`public = false`), partial unique index for KTP, quota trigger, immutability trigger |
| **Tracking Token** | Base62 format regex, length bounds | Server-only, constant-time `timingSafeEqual`, dummy HMAC branch, rate limiter | Unique index on `tracking_token_hash`, immutability trigger |
| **Workflow State Machine** | `AdminWorkflowUpdateSchema` superRefine | `executeAdminWorkflowUpdate` with `requireAdmin()` | CHECK constraints, `guard_permohonan_state_machine` trigger, `admin_update_permohonan_workflow` RPC |
| **Keberatan** | `CreateKeberatanSchema`, `AdminUpdateKeberatanSchema` | `createKeberatan` owner + `status_proses === 'selesai'` check | Column-level GRANT, RLS `status_proses = 'selesai'` policy, DELETE disabled |
| **Legacy Claim** | `NikSchema` (16 digits), `LegacyIdSchema`, date regex | Rate limiter (3 failures / 15m), anti-hijack null check | `pemohon_id` immutability once set (`OLD.pemohon_id <> NEW.pemohon_id`) |

---

## 4. Verification Test Matrix

All test suites use Node's native test runner (`node --test --experimental-strip-types`) with structural, cryptographic, and static SQL contract assertions.

| Test File | Target Step | Assertions Covered | Status |
|---|---|---|---|
| `tests/gate-b-data-access.test.ts` | Step 1 | DTO projections, forbidden columns, Zod input bounds, server-only guard, query audit | **PASS** |
| `tests/gate-b-document-storage.test.ts` | Step 2 | Magic bytes (PDF/JPEG/PNG), executable blocking, quota invariants, migration 000005 SQL | **PASS** |
| `tests/gate-b-tracking-token.test.ts` | Step 3 | Base62 alphabet/entropy, HMAC-SHA-256 format, constant-time compare, dummy branch | **PASS** |
| `tests/gate-b-workflow.test.ts` | Step 4 | Workflow status/decisions, intermediate vs terminal invariants, migration 000003 SQL | **PASS** |
| `tests/gate-b-keberatan.test.ts` | Step 5 | Objection DTOs, Zod refinements (tanggapan atasan), terminal state RLS, column grants | **PASS** |
| `tests/gate-b-legacy-claim.test.ts` | Step 6 | NIK 16-digits, rate limiter (3 failures / 15m, reset), anti-hijacking, audit logging | **PASS** |
| `tests/phase2-gate-a-database.test.ts` | Gate A Regression | Schema foundation, numbering invariants, allocation concurrency | **PASS** |
| `tests/phase2-gate-a-authz.test.ts` | Gate A Regression | RLS policies, direct client write blocks, trigger security definer | **PASS** |

### Execution Commands
```bash
# 1. Gate B Test Suites
node --test --experimental-strip-types tests/gate-b-data-access.test.ts
node --test --experimental-strip-types tests/gate-b-document-storage.test.ts
node --test --experimental-strip-types tests/gate-b-tracking-token.test.ts
node --test --experimental-strip-types tests/gate-b-workflow.test.ts
node --test --experimental-strip-types tests/gate-b-keberatan.test.ts
node --test --experimental-strip-types tests/gate-b-legacy-claim.test.ts

# 2. Gate A Regression Test Suites
node --test --experimental-strip-types tests/phase2-gate-a-database.test.ts
node --test --experimental-strip-types tests/phase2-gate-a-authz.test.ts

# 3. TypeScript Typecheck & Production Build
npm run typecheck
npm run build
```
