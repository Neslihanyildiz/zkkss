// src/lib/aes.ts

export async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptFile(
  fileBytes: ArrayBuffer,
  aesKey: CryptoKey,
): Promise<Uint8Array> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    fileBytes,
  );

  const result = new Uint8Array(iv.length + encryptedContent.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedContent), iv.length);

  return result;
}

/**
 * Encrypt a short string (e.g. filename) with AES-GCM.
 * Returns a base64 string so it can be stored in the database as text.
 */
export async function encryptString(text: string, aesKey: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), 12);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded string produced by encryptString.
 */
export async function decryptString(base64: string, aesKey: CryptoKey): Promise<string> {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const iv   = bytes.slice(0, 12);
  const data = bytes.slice(12);
  const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, data);
  return new TextDecoder().decode(decrypted);
}

export async function decryptFile(
  encryptedBytesWithIV: Uint8Array,
  aesKey: CryptoKey,
): Promise<ArrayBuffer> {
  const iv = encryptedBytesWithIV.slice(0, 12);
  const data = encryptedBytesWithIV.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data,
  );

  return decryptedContent;
}
