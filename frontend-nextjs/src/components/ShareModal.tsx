// src/components/ShareModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, Users, Send } from "lucide-react";
import { api } from "@/lib/api";
import { User, FileData } from "@/lib/types";
import { importKey, unwrapAESKey, wrapAESKey } from "@/lib/rsa";
import { getPrivateKey } from "@/lib/keyStorage";

interface ShareModalProps {
  file: FileData;
  user: User | null;
  onClose: () => void;
  onShare: () => void;
}

export default function ShareModal({ file, user, onClose, onShare }: ShareModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Server excludes current user via JWT — no myId param needed
        const userList = await api.getUsersList();
        setUsers(userList);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };
    loadUsers();
  }, []);

  const handleShare = async () => {
    if (!user || !selectedUserId) {
      setStatus("Please select a user");
      return;
    }

    setIsLoading(true);
    setStatus("Preparing share…");

    try {
      // 1. Download the encrypted file (ownership check happens on server)
      const blob = await api.downloadFile(file.id);
      const buffer = await blob.arrayBuffer();

      // 2. Get private key from IndexedDB (non-extractable CryptoKey)
      const privateKey = await getPrivateKey(user.username);
      if (!privateKey) throw new Error("Private key not found in IndexedDB. Please re-register.");

      // 3. Extract the wrapped AES key from the file package
      //    Format: [4-byte key length][wrapped key][encrypted content]
      const view = new DataView(buffer);
      const keyLength = view.getUint32(0, true);
      const wrappedKey = buffer.slice(4, 4 + keyLength);

      // 4. Unwrap AES key using our private key
      const aesKey = await unwrapAESKey(wrappedKey, privateKey);

      // 5. Get recipient's public key and import it
      const recipientUser = users.find((u) => u.id === selectedUserId);
      if (!recipientUser) throw new Error("Recipient not found");
      if (!recipientUser.public_key) throw new Error("Recipient has no public key on file");

      const recipientPubKey = await importKey(recipientUser.public_key, "public");

      // 6. Re-wrap the AES key with the recipient's public key
      const reWrappedKey = await wrapAESKey(aesKey, recipientPubKey);
      const reWrappedKeyArray = Array.from(new Uint8Array(reWrappedKey));

      // 7. Send share record to server
      //    fromUserId is no longer sent — the server reads it from the JWT
      await api.shareFile(file.id, selectedUserId, JSON.stringify(reWrappedKeyArray));

      setStatus(`✅ File shared with ${recipientUser.username}!`);
      setTimeout(() => { onShare(); onClose(); }, 1500);
    } catch (error: unknown) {
      setStatus(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-navy-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Users className="w-5 h-5 text-blue-900" />
            </div>
            <h2 className="text-xl font-bold text-navy-900">Share File</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-navy-100 transition-colors">
            <X className="w-6 h-6 text-navy-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Info */}
          <div className="p-4 bg-navy-50 rounded-lg border border-navy-100">
            <p className="text-sm text-navy-600 mb-1">File</p>
            <p className="font-semibold text-navy-900 truncate">
              {file.original_name || file.filename}
            </p>
          </div>

          {/* User Selection */}
          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-3">Share with:</label>
            {users.length === 0 ? (
              <p className="text-navy-600 text-sm py-4 text-center">No other users available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center p-3 border border-navy-200 rounded-lg cursor-pointer hover:bg-navy-50 transition-colors"
                  >
                    <input
                      type="radio"
                      name="user"
                      value={u.id}
                      checked={selectedUserId === u.id}
                      onChange={() => setSelectedUserId(u.id)}
                      className="mr-3 w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-navy-900">{u.username}</p>
                      <p className="text-xs text-navy-600">ID: {u.id}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          {status && (
            <div className={`p-4 rounded-lg text-sm ${
              status.includes("✅") ? "bg-green-50 text-green-700 border border-green-200"
              : status.includes("❌") ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {status}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 bg-navy-50 border-t border-navy-100 rounded-b-xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-navy-900 border border-navy-200 rounded-lg font-semibold hover:bg-navy-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isLoading || !selectedUserId}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg font-semibold hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isLoading ? "Sharing…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
