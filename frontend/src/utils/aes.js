// 1. Rastgele AES Anahtarı Oluştur
export async function generateAESKey() {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// 2. Dosyayı Şifrele 
export async function encryptFile(fileBytes, aesKey) {
  // IV (Initialization Vector) - Güvenlik için rastgele olmalı
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); 

  const encryptedContent = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    fileBytes
  );

  // Şifreli verinin başına IV'yi eklemeliyiz
  const result = new Uint8Array(iv.length + encryptedContent.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedContent), iv.length);

  return result;
}

// 3. Dosyayı Çöz
export async function decryptFile(encryptedBytesWithIV, aesKey) {
  // İlk 12 byte IV'dir, onu ayır
  const iv = encryptedBytesWithIV.slice(0, 12);
  const data = encryptedBytesWithIV.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    aesKey,
    data
  );

  return decryptedContent;
}