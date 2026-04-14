// src/lib/keyStorage.ts
//
// Stores RSA private keys in IndexedDB as non-extractable CryptoKey objects.
// A key stored with extractable: false cannot be read out via the console,
// copied, or exfiltrated by XSS — the browser exposes it only to the
// Web Crypto API for cryptographic operations.

const DB_NAME    = "SecureShareKeys";
const DB_VERSION = 1;
const STORE      = "privateKeys";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Persist a private key to IndexedDB as non-extractable.
 *
 * Accepts either the JWK string (from registration) or an existing CryptoKey.
 * The key is always re-imported with `extractable: false` before storage,
 * so even if the caller passes an extractable key the stored copy is locked.
 */
export async function storePrivateKey(username: string, jwkStrOrKey: string | CryptoKey): Promise<void> {
  let nonExtractableKey: CryptoKey;

  if (typeof jwkStrOrKey === "string") {
    const jwk = JSON.parse(jwkStrOrKey);
    delete jwk.key_ops; // strip key_ops to avoid browser conflicts
    nonExtractableKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,            // <-- extractable: false
      ["unwrapKey"],
    );
  } else {
    // Already a CryptoKey — export to JWK then re-import non-extractable
    // (this path assumes the source key was generated with extractable: true)
    const jwk = await window.crypto.subtle.exportKey("jwk", jwkStrOrKey);
    (jwk as Record<string, unknown>).key_ops = undefined;
    nonExtractableKey = await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["unwrapKey"],
    );
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(nonExtractableKey, `priv_${username}`);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

/**
 * Retrieve the private key for a given username.
 * Returns the CryptoKey directly — it can be used for unwrapKey but not exported.
 */
export async function getPrivateKey(username: string): Promise<CryptoKey | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(`priv_${username}`);
    req.onsuccess = () => resolve((req.result as CryptoKey) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

/** Remove a user's private key (call on logout or account deletion). */
export async function deletePrivateKey(username: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(`priv_${username}`);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}
