// src/lib/rsa.ts

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["wrapKey", "unwrapKey"],
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

export async function importKey(
  keyDataStr: string,
  type: "public" | "private",
): Promise<CryptoKey> {
  const keyData = JSON.parse(keyDataStr);
  // Strip key_ops from JWK to avoid usage conflicts across browsers
  delete keyData.key_ops;
  return await window.crypto.subtle.importKey(
    "jwk",
    keyData,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    type === "public" ? ["wrapKey"] : ["unwrapKey"],
  );
}

// Derives a public key JWK string from a private key JWK string.
// RSA private JWK contains the public components (n, e) so no server call needed.
export function derivePublicKeyStr(privateKeyStr: string): string {
  const priv = JSON.parse(privateKeyStr);
  const pubJwk: Record<string, unknown> = {
    kty: priv.kty,
    n:   priv.n,
    e:   priv.e,
    ext: true,
  };
  if (priv.alg) pubJwk.alg = priv.alg;
  return JSON.stringify(pubJwk);
}

export async function wrapAESKey(
  aesKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<ArrayBuffer> {
  return await window.crypto.subtle.wrapKey(
    "raw",
    aesKey,
    publicKey,
    { name: "RSA-OAEP" },
  );
}

export async function unwrapAESKey(
  encryptedAESKey: ArrayBuffer,
  privateKey: CryptoKey,
): Promise<CryptoKey> {
  return await window.crypto.subtle.unwrapKey(
    "raw",
    encryptedAESKey,
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"],
  );
}
