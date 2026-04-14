// src/components/UploadZone.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { User } from "@/lib/types";
import { generateAESKey, encryptFile } from "@/lib/aes";
import { importKey, wrapAESKey, derivePublicKeyStr } from "@/lib/rsa";

interface UploadZoneProps {
  onUploadSuccess: () => void;
  user: User | null;
}

export default function UploadZone({ onUploadSuccess, user }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
  }>({ type: "idle", message: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!user) {
      setStatus({ type: "error", message: "User not found" });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Get user's public key
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      let pubKeyStr: string | null =
        storedUser?.public_key ||
        localStorage.getItem(`pub_${user.username}`);

      // Fallback: derive public key from stored private key JWK
      if (!pubKeyStr || pubKeyStr === "undefined" || pubKeyStr === "null") {
        const privKeyStr = localStorage.getItem(`priv_${user.username}`);
        if (!privKeyStr || privKeyStr === "undefined") {
          throw new Error("Keys not found. Please register again.");
        }
        pubKeyStr = derivePublicKeyStr(privKeyStr);
        localStorage.setItem(`pub_${user.username}`, pubKeyStr);
      }

      let publicKey: CryptoKey;
      try {
        publicKey = await importKey(pubKeyStr, "public");
      } catch {
        throw new Error("Step 1 failed: importKey — " + pubKeyStr?.slice(0, 40));
      }

      // 2. Read file
      const fileBuffer = await file.arrayBuffer();

      // 3. Generate AES key
      let aesKey: CryptoKey;
      try {
        aesKey = await generateAESKey();
      } catch (e) {
        throw new Error("Step 3 failed: generateAESKey — " + e);
      }

      // 4. Encrypt file
      let encryptedContent: Uint8Array;
      try {
        encryptedContent = await encryptFile(fileBuffer, aesKey);
      } catch (e) {
        throw new Error("Step 4 failed: encryptFile — " + e);
      }
      setUploadProgress(50);

      // 5. Wrap AES key with RSA public key
      let wrappedKey: ArrayBuffer;
      try {
        wrappedKey = await wrapAESKey(aesKey, publicKey);
      } catch (e) {
        throw new Error("Step 5 failed: wrapAESKey — " + e);
      }

      // 6. Package: [Key Length (4 bytes)] + [Wrapped Key] + [Encrypted Content]
      const keyLength = wrappedKey.byteLength;
      const finalBuffer = new Uint8Array(4 + keyLength + encryptedContent.byteLength);
      const view = new DataView(finalBuffer.buffer);
      view.setUint32(0, keyLength, true);
      finalBuffer.set(new Uint8Array(wrappedKey), 4);
      finalBuffer.set(encryptedContent, 4 + keyLength);

      setUploadProgress(75);

      // 7. Send to backend — token is added by api.uploadFile via authHeader()
      const blob = new Blob([finalBuffer]);
      const formData = new FormData();
      formData.append("encryptedFile", blob, file.name + ".enc");
      // userId no longer needed in body — the server reads it from the JWT

      await api.uploadFile(formData);

      setUploadProgress(100);
      setStatus({ type: "success", message: `✅ ${file.name} encrypted and uploaded!` });

      setTimeout(() => {
        setStatus({ type: "idle", message: "" });
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        onUploadSuccess();
      }, 2000);
    } catch (error: unknown) {
      setStatus({
        type: "error",
        message: `❌ Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setStatus({ type: "idle", message: "" });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setStatus({ type: "idle", message: "" });
    }
  };

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-bold text-navy-900 mb-6">Upload Files Securely</h2>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-navy-900 bg-navy-50"
            : selectedFile
            ? "border-navy-500 bg-navy-50"
            : "border-navy-200 hover:border-navy-400 hover:bg-navy-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        <Upload className="w-12 h-12 text-navy-400 mx-auto mb-4" />
        {selectedFile ? (
          <>
            <p className="text-sm text-navy-500 mb-1">Selected file</p>
            <p className="font-semibold text-navy-900 truncate max-w-xs mx-auto">{selectedFile.name}</p>
            <p className="text-xs text-navy-400 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB — click to change
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-navy-900 mb-2">Drag a file here</h3>
            <p className="text-navy-600 text-sm">or click to browse</p>
            <p className="text-navy-400 text-xs mt-3">🔒 Encrypted in your browser before upload</p>
          </>
        )}
      </div>

      {/* Encrypt & Upload Button */}
      <button
        onClick={() => selectedFile && handleUpload(selectedFile)}
        disabled={!selectedFile || isUploading}
        className="mt-4 w-full py-3 bg-navy-900 text-white rounded-xl font-semibold text-sm hover:bg-navy-700 transition-colors shadow-navy-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Upload className="w-4 h-4" />
        {isUploading ? "Encrypting & Uploading…" : "Encrypt & Upload"}
      </button>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-navy-900">Upload Progress</span>
            <span className="text-sm font-medium text-navy-600">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-navy-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-navy-900 to-navy-700 transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {status.type !== "idle" && (
        <div
          className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
            status.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {status.type === "success" ? (
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <p className={status.type === "success" ? "text-green-700" : "text-red-700"}>
            {status.message}
          </p>
        </div>
      )}
    </div>
  );
}
