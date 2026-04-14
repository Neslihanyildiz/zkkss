// src/components/FileCard.tsx
"use client";

import { FileData } from "@/lib/types";
import { Download, Share2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FileCardProps {
  file: FileData;
  onShare: (file: FileData) => void;
  onDownload: (fileId: number, fileName: string) => void;
  index: number;
}

export default function FileCard({
  file,
  onShare,
  onDownload,
  index,
}: FileCardProps) {
  const uploadDate = new Date(file.upload_date || file.createdAt || "");
  const formattedDate = uploadDate.toLocaleDateString();
  const timeAgo = formatDistanceToNow(uploadDate, { addSuffix: true });

  const getFileIcon = (filename: string) => {
    if (filename.includes(".pdf")) return "📄";
    if (filename.includes(".doc")) return "📝";
    if (filename.includes(".zip")) return "🗂️";
    if (filename.includes(".img")) return "🖼️";
    return "📦";
  };

  return (
    <div
      className="card p-6 hover:shadow-navy-md transition-all duration-300 animate-fadeIn"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* File Info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="text-3xl flex-shrink-0">
            {getFileIcon(file.filename)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-navy-900 truncate">
              {file.original_name || file.filename}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs bg-navy-100 text-navy-700 px-2 py-1 rounded">
                🔒 Encrypted
              </span>
              <span className="text-xs text-navy-600">{formattedDate}</span>
              <span className="text-xs text-navy-500">{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Download Button */}
          <button
            onClick={() =>
              onDownload(file.id, file.original_name || file.filename)
            }
            className="p-2 rounded-lg bg-navy-100 text-navy-900 hover:bg-navy-200 transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Share Button */}
          <button
            onClick={() => onShare(file)}
            className="p-2 rounded-lg bg-blue-100 text-blue-900 hover:bg-blue-200 transition-colors"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Delete Button */}
          <button
            className="p-2 rounded-lg bg-red-100 text-red-900 hover:bg-red-200 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
