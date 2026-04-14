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
