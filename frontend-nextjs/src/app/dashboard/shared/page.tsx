// src/app/dashboard/shared/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Share2 } from "lucide-react";
import { api, SharedFile } from "@/lib/api";
import { User } from "@/lib/types";
import { unwrapAESKey } from "@/lib/rsa";
import { decryptFile } from "@/lib/aes";
import { getPrivateKey } from "@/lib/keyStorage";

export default function SharedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSharedFiles = async () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          // userId now comes from JWT on the server — no param needed
          const files = await api.getSharedFiles();
          setSharedFiles(files);
        }
      } catch (error) {
        console.error("Error loading shared files:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSharedFiles();
  }, []);

  const handleDownload = async (
    fileId: number,
    fileName: string,
    encryptedKey: string,
  ) => {
    if (!user) return;

    try {
      // Download encrypted blob
      const blob = await api.downloadFile(fileId);
      const buffer = await blob.arrayBuffer();

      // Get private key from IndexedDB (non-extractable CryptoKey)
      const privateKey = await getPrivateKey(user.username);
      if (!privateKey) throw new Error("Private key not found in IndexedDB. Please re-register.");

      // Parse the recipient-encrypted AES key (stored as JSON array of bytes)
      const keyArray = JSON.parse(encryptedKey) as number[];
      const keyBuffer = new Uint8Array(keyArray).buffer;

      // Unwrap the AES key using our private key
      const aesKey = await unwrapAESKey(keyBuffer, privateKey);

      // Parse the file format: [4-byte key length][wrapped key][encrypted content]
      const view = new DataView(buffer);
      const keyLength = view.getUint32(0, true);
      const encryptedContent = buffer.slice(4 + keyLength);

      // Decrypt and trigger download
      const decryptedBuffer = await decryptFile(new Uint8Array(encryptedContent), aesKey);
      const url = window.URL.createObjectURL(new Blob([decryptedBuffer]));
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(".enc", "");
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error downloading: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-900 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Shared Files</h1>
        <p className="text-navy-600">Files shared with you by other users</p>
      </div>

      {/* Shared Files List */}
      <div className="space-y-3">
        {sharedFiles.length === 0 ? (
          <div className="text-center py-16 card">
            <Share2 className="w-16 h-16 text-navy-200 mx-auto mb-4" />
            <p className="text-navy-600 text-lg">No files shared with you yet</p>
          </div>
        ) : (
          sharedFiles.map((file, index) => (
            <div
              key={file.id}
              className="card p-6 hover:shadow-navy-md transition-all duration-300 animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-3xl flex-shrink-0">📧</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-navy-900 truncate">{file.filename}</h3>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        👤 From: {file.sender_name}
                      </span>
                      <span className="text-xs text-navy-600">
                        {new Date(file.upload_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(file.id, file.filename, file.encrypted_key)}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors flex-shrink-0"
                >
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
