// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Upload, Download, Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { User, FileData } from "@/lib/types";
import FileCard from "@/components/fileCard";
import UploadZone from "@/components/UploadZone";
import ShareModal from "@/components/ShareModal";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);

  const loadData = useCallback(async () => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const filesList = await api.getFiles();
        const filesWithOwnerId = filesList.map((file) => ({
          ...file,
          owner_id: parsedUser.id,
        }));
        setFiles(filesWithOwnerId);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleShare = (file: FileData) => {
    setSelectedFile(file);
    setShowShareModal(true);
  };

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const blob = await api.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(".enc", "");
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Error downloading file");
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-navy-600 text-sm font-medium">
                Files Encrypted
              </p>
              <p className="text-3xl font-bold text-navy-900 mt-2">
                {files.length}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-navy-100">
              <Upload className="w-8 h-8 text-navy-900" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-navy-600 text-sm font-medium">Total Size</p>
              <p className="text-3xl font-bold text-navy-900 mt-2">
                {(
                  files.reduce((acc, f) => acc + (f.size || 0), 0) /
                  1024 /
                  1024
                ).toFixed(2)}{" "}
                MB
              </p>
            </div>
            <div className="p-4 rounded-lg bg-navy-100">
              <Download className="w-8 h-8 text-navy-900" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-navy-600 text-sm font-medium">
                Encryption Type
              </p>
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
          className="input-field"
        />
      </div>

      {/* Files List */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-navy-900">Your Files</h2>
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 card">
            <p className="text-navy-600">
              No files yet. Upload one to get started!
            </p>
          </div>
        ) : (
          filteredFiles.map((file, index) => (
            <FileCard
              key={file.id}
              file={file}
              onShare={handleShare}
              onDownload={handleDownload}
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
          onShare={() => {
            loadData();
            setShowShareModal(false);
          }}
        />
      )}
    </div>
  );
}
