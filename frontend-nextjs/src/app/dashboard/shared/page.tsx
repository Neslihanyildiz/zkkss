// src/app/dashboard/shared/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Share2 } from "lucide-react";
import { api } from "@/lib/api";
import type { SharedFile } from "@/lib/types";
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
          const parsedUser = JSON.parse(userData) as User;
          setUser(parsedUser);
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

  const handleDownload = async (file: SharedFile) => {
    if (!user) return;

    try {
      // 1. Get a 60-second signed URL from the backend (IDOR check happens here)
      const { url } = await api.getDownloadUrl(file.id);

      // 2. Fetch raw encrypted content from Supabase Storage
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file from storage");
      const encryptedContent = new Uint8Array(await response.arrayBuffer());

      // 3. Get private key from IndexedDB (non-extractable)
      const privateKey = await getPrivateKey(user.username);
      if (!privateKey) throw new Error("Private key not found in IndexedDB. Please re-register.");

      // 4. Unwrap the recipient-specific AES key
      const keyArray = JSON.parse(file.encrypted_key) as number[];
      const keyBuffer = new Uint8Array(keyArray).buffer;
      const aesKey = await unwrapAESKey(keyBuffer, privateKey);

      // 5. Decrypt and trigger browser download
      const decryptedBuffer = await decryptFile(encryptedContent, aesKey);
      const blob = new Blob([decryptedBuffer]);
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.filename.replace(".enc", "");
      a.click();
      window.URL.revokeObjectURL(objectUrl);
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
      <div>
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Shared Files</h1>
        <p className="text-navy-600">Files shared with you by other users</p>
      </div>

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
                  onClick={() => handleDownload(file)}
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
