/**
 * PPID Parepare - Password Policy Specification
 *
 * Policy Rules:
 * 1. Minimum 8 characters.
 * 2. No mandatory complexity requirements (no required uppercase, lowercase, numbers, or special chars).
 * 3. Rejects trivial/common weak passwords (e.g. 'password').
 * 4. Password storage and hashing is handled completely by Supabase Auth (bcrypt).
 */

const BLOCKED_WEAK_PASSWORDS = new Set([
  'password',
  'qwerty123',
  '11111111',
  'admin123',
  '1234567!',
]);

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password wajib diisi.' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password minimal 8 karakter.' };
  }

  if (BLOCKED_WEAK_PASSWORDS.has(password.toLowerCase().trim())) {
    return { valid: false, error: 'Password terlalu lemah atau umum. Gunakan password yang lebih aman.' };
  }

  return { valid: true };
}
