// 1. RSA Anahtar Çifti Oluştur
export async function generateRSAKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );
  return keyPair;
}

// 2. Anahtarı Dışarı Aktar 
export async function exportKey(key) {
  const exported = await window.crypto.subtle.exportKey(
    "jwk",
    key
  );
  return JSON.stringify(exported);
}

// 3. Anahtarı İçeri Al
export async function importKey(keyDataStr, type) {
  const keyData = JSON.parse(keyDataStr);
  return await window.crypto.subtle.importKey(
    "jwk",
    keyData,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    type === "public" ? ["encrypt", "wrapKey"] : ["decrypt", "unwrapKey"]
  );
}

// 4. AES Anahtarını Şifrele (Wrap)
export async function wrapAESKey(aesKey, publicKey) {
  const rawKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const encryptedKey = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP"
    },
    publicKey,
    rawKey
  );
  return encryptedKey;
}

// 5. Şifreli AES Anahtarını Çöz (Unwrap)
export async function unwrapAESKey(encryptedAESKey, privateKey) {
  const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP"
    },
    privateKey,
    encryptedAESKey
  );

  return await window.crypto.subtle.importKey(
    "raw",
    decryptedKeyBuffer,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
}