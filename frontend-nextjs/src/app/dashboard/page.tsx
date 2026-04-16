// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, Download, Share2 } from "lucide-react";
import { api, FileData } from "@/lib/api";
import { User } from "@/lib/types";
import FileCard from "@/components/fileCard";
import UploadZone from "@/components/UploadZone";
import ShareModal from "@/components/ShareModal";
import { getPrivateKey } from "@/lib/keyStorage";
import { unwrapAESKey } from "@/lib/rsa";
import { decryptFile } from "@/lib/aes";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [noKey, setNoKey] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);
        const rawFiles = await api.getFiles();
        setFiles(rawFiles);

        const privateKey = await getPrivateKey(parsedUser.username);
        setNoKey(!privateKey);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleShare = (file: FileData) => {
    setSelectedFile(file);
    setShowShareModal(true);
  };

  const handleDownload = async (fileId: number, fileName: string, encryptedKey: string | null) => {
    if (!user) return;

    if (!encryptedKey) {
      alert("Cannot decrypt: no key found for this file. Try re-uploading.");
      return;
    }

    try {
      // 1. Get signed URL from backend (IDOR check happens here)
      const { url } = await api.getDownloadUrl(fileId);

      // 2. Fetch the raw encrypted content from Supabase Storage
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch file from storage");
      const encryptedContent = new Uint8Array(await response.arrayBuffer());

      // 3. Get private key from IndexedDB (non-extractable)
      const privateKey = await getPrivateKey(user.username);
      if (!privateKey) throw new Error("Private key not found. Please re-register.");

      // 4. Parse the wrapped AES key and unwrap it
      const keyArray = JSON.parse(encryptedKey) as number[];
      const keyBuffer = new Uint8Array(keyArray).buffer;
      const aesKey = await unwrapAESKey(keyBuffer, privateKey);

      // 5. Decrypt and trigger download
      const decryptedBuffer = await decryptFile(encryptedContent, aesKey);
      const blob = new Blob([decryptedBuffer]);
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      alert(`Download error: ${error instanceof Error ? error.message : String(error)}`);
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
      {/* No-key warning */}
      {noKey && (
        <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold">Encryption key not found</p>
            <p className="mt-0.5">Your private key is missing from this browser. You can view files but cannot upload, download, or share until you <strong>log out and log back in</strong>. If the problem persists, contact your system administrator to reset your account.</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-navy-600 text-sm font-medium">Files Encrypted</p>
              <p className="text-3xl font-bold text-navy-900 mt-2">{files.length}</p>
            </div>
            <div className="p-4 rounded-lg bg-navy-100">
              <Upload className="w-8 h-8 text-navy-900" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-navy-600 text-sm font-medium">Shared With You</p>
              <p className="text-3xl font-bold text-navy-900 mt-2">—</p>
            </div>
            <div className="p-4 rounded-lg bg-navy-100">
              <Download className="w-8 h-8 text-navy-900" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-navy-600 text-sm font-medium">Encryption</p>
              <p className="text-3xl font-bold text-navy-900 mt-2">AES-256</p>
            </div>
            <div className="p-4 rounded-lg bg-navy-100">
              <Share2 className="w-8 h-8 text-navy-900" />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <UploadZone onUploadSuccess={loadData} user={user} />

      {/* Search Bar */}
      <div>
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
        />
      </div>

      {/* Files List */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-navy-900">Your Files</h2>
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 card">
            <p className="text-navy-600">No files yet. Upload one to get started!</p>
          </div>
        ) : (
          filteredFiles.map((file, index) => (
            <FileCard
              key={file.id}
              file={file}
              onShare={handleShare}
              onDownload={(id, name) => handleDownload(id, name, file.encrypted_key)}
              index={index}
            />
          ))
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && selectedFile && (
        <ShareModal
          file={selectedFile}
          user={user}
          onClose={() => setShowShareModal(false)}
          onShare={() => { loadData(); setShowShareModal(false); }}
        />
      )}
    </div>
  );
}
