// src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

// ── Token helpers ──────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeader(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Response types ─────────────────────────────────────────────────────────

interface RegisterResponse {
  message: string;
  userId: number;
  error?: string;
}

interface LoginResponse {
  message: string;
  token: string;
  /** PBKDF2-wrapped RSA private key (base64) — null for accounts created before this feature */
  encrypted_private_key?: string | null;
  /** PBKDF2 salt used when wrapping (base64) */
  key_salt?: string | null;
  user: {
    id: number;
    username: string;
    public_key: string;
    role: import("@/lib/types").UserRole;
  };
  error?: string;
}

interface UploadResponse {
  message: string;
  fileId?: number;
  error?: string;
}

interface ShareResponse {
  message: string;
  error?: string;
}

/** Signed URL returned by the download endpoint */
interface DownloadResponse {
  url: string;
  filename: string;
  error?: string;
}

// Single source of truth — types live in types.ts, re-exported here for convenience
import type { User, FileData, SharedFile, AuditLog } from "@/lib/types";
export type { User, FileData, SharedFile, AuditLog };

// ── API calls ──────────────────────────────────────────────────────────────

export const api = {
  // POST /api/auth/register
  register: async (
    username: string,
    password: string,
    publicKey: string,
    encryptedPrivateKey: string,
    keySalt: string,
  ): Promise<RegisterResponse> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, publicKey, encryptedPrivateKey, keySalt }),
    });
    return res.json();
  },

  // POST /api/auth/login
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Login failed");
    }
    return res.json();
  },

  // POST /api/files/upload  (multipart — 'file' + 'encryptedKey' + 'encryptedFilename' fields)
  uploadFile: async (formData: FormData): Promise<UploadResponse> => {
    const res = await fetch(`${API_URL}/files/upload`, {
      method: "POST",
      headers: authHeader(),
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Upload failed");
    }
    return res.json();
  },

  // GET /api/files/list  → FileData[] (each item includes encrypted_key)
  getFiles: async (): Promise<FileData[]> => {
    const res = await fetch(`${API_URL}/files/list`, {
      headers: { ...authHeader() },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // GET /api/files/download/:fileId  → signed URL (60-second expiry)
  getDownloadUrl: async (fileId: number): Promise<DownloadResponse> => {
    const res = await fetch(`${API_URL}/files/download/${fileId}`, {
      headers: authHeader(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Download failed");
    }
    return res.json();
  },

  // GET /api/files/logs
  getLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${API_URL}/files/logs`, {
      headers: { ...authHeader() },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // GET /api/files/users  (all users except current)
  getUsersList: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/files/users`, {
      headers: { ...authHeader() },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // POST /api/files/share  (fromUserId comes from JWT on server)
  shareFile: async (
    fileId: number,
    toUserId: number,
    encryptedKey: string,
  ): Promise<ShareResponse> => {
    const res = await fetch(`${API_URL}/files/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ fileId, toUserId, encryptedKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error || "Share failed");
    }
    return res.json();
  },

  // GET /api/files/shared  → SharedFile[] (files shared WITH current user)
  getSharedFiles: async (): Promise<SharedFile[]> => {
    const res = await fetch(`${API_URL}/files/shared`, {
      headers: { ...authHeader() },
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },
};
