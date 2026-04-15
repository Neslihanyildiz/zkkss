// src/lib/keyWrapping.ts
//
// PBKDF2-based RSA private key wrapping for cross-device access.
//
// How it works:
//  1. Registration: derive AES-256-KW key from password + random salt using
//     PBKDF2-SHA256 (600k iterations). Wrap the RSA private key in PKCS#8
//     format with that AES key. Store the wrapped key + salt on the server.
//  2. Login (any device): server returns wrapped key + salt. Browser derives
//     the same AES key from password + salt. Unwraps private key. Stores in
//     IndexedDB (non-extractable) for use during the session.
//
// Security:
//  - Password never leaves the browser (only bcrypt hash goes to server)
//  - 600k PBKDF2 iterations ≈ OWASP 2023 recommendation for PBKDF2-SHA256
//  - Attacker who steals the DB still needs to brute-force the password
//  - Unwrapped private key in IndexedDB is non-extractable (no console export)

const PBKDF2_ITERATIONS = 600_000;

/** Generate a random 32-byte PBKDF2 salt. */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/** Encode salt (or any ArrayBuffer) to base64 for server storage. */
export function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...salt));
}

/** Decode a base64 salt back to Uint8Array. */
export function base64ToSalt(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Derive an AES-256-KW wrapping key from a plaintext password + salt.
 * The same password + salt always produces the same wrapping key.
 */
export async function deriveWrappingKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const raw = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  // Cast required: TypeScript's Web Crypto types distinguish ArrayBuffer from
  // ArrayBufferLike, but at runtime both are valid BufferSource values.
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    raw,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/**
 * Wrap an RSA private key with the AES-KW wrapping key.
 * Uses PKCS#8 export format — standard binary encoding for private keys.
 * Returns a base64 string safe for server storage.
 *
 * Requires: privateKey.extractable === true (set during key generation).
 */
export async function wrapPrivateKey(
  privateKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey(
    "pkcs8",
    privateKey,
    wrappingKey,
    "AES-KW",
  );
  return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

/**
 * Unwrap the server-stored private key using the AES-KW wrapping key.
 * Returns a non-extractable RSA-OAEP CryptoKey with ["unwrapKey"] usage.
 * Ready to be stored in IndexedDB and used for AES key unwrapping.
 */
export async function unwrapPrivateKey(
  wrappedBase64: string,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const bytes = Uint8Array.from(atob(wrappedBase64), (c) => c.charCodeAt(0));
  return crypto.subtle.unwrapKey(
    "pkcs8",
    bytes.buffer,
    wrappingKey,
    "AES-KW",
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,           // non-extractable — cannot be exported from IndexedDB
    ["unwrapKey"],
  );
}
