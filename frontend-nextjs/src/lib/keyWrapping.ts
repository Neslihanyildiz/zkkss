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

/** Encode a Uint8Array to base64 using a loop (safe for large arrays). */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Decode a base64 string to Uint8Array, stripping any whitespace first. */
function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64.replace(/\s/g, "")), (c) => c.charCodeAt(0));
}

/** Encode salt (or any ArrayBuffer) to base64 for server storage. */
export function saltToBase64(salt: Uint8Array): string {
  return toBase64(salt);
}

/** Decode a base64 salt back to Uint8Array. */
export function base64ToSalt(b64: string): Uint8Array {
  return fromBase64(b64);
}

/**
 * Derive an AES-256-GCM encryption key from a plaintext password + salt.
 * Uses AES-GCM (not AES-KW) — no 8-byte alignment requirement, works on
 * all browsers with any key size.
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
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    raw,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Wrap an RSA private key by exporting it as JWK and encrypting with AES-GCM.
 * Stores IV (12 bytes) + ciphertext as a single base64 string.
 * AES-GCM has no alignment requirement so it works with any key size.
 */
export async function wrapPrivateKey(
  privateKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const encoded = new TextEncoder().encode(JSON.stringify(jwk));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    encoded,
  );
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);
  return toBase64(combined);
}

/**
 * Unwrap a server-stored private key: decrypt with AES-GCM, parse JWK,
 * re-import as non-extractable CryptoKey ready for use in IndexedDB.
 */
export async function unwrapPrivateKey(
  wrappedBase64: string,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const combined = fromBase64(wrappedBase64);
  const iv         = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted  = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    ciphertext,
  );
  const jwk = JSON.parse(new TextDecoder().decode(decrypted)) as JsonWebKey;
  delete (jwk as Record<string, unknown>).key_ops;
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["unwrapKey"],
  );
}
