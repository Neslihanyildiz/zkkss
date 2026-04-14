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
  user: {
    id: number;
    username: string;
    public_key: string;
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

export interface User {
  id: number;
  username: string;
  public_key: string;
}

export interface FileData {
  id: number;
  filename: string;
  upload_date: string;
  size?: number;
  owner_id?: number;
}

export interface SharedFile {
  id: number;
  filename: string;
  sender_name: string;
  encrypted_key: string;
  upload_date: string;
  from_user_id: number;
  to_user_id: number;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  details: string;
  timestamp: string;
  createdAt?: string;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const api = {
  // POST /api/auth/register
  register: async (
    username: string,
    password: string,
    publicKey: string,
  ): Promise<RegisterResponse> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, publicKey }),
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
      throw new Error(body.error || "Login failed");
    }
    return res.json();
  },

  // POST /api/files/upload  (multipart, protected)
  uploadFile: async (formData: FormData): Promise<UploadResponse> => {
    const res = await fetch(`${API_URL}/files/upload`, {
      method: "POST",
      headers: authHeader(),
      body: formData,
    });
    return res.json();
  },

  // GET /api/files/list  (protected — server uses token for userId)
  getFiles: async (): Promise<FileData[]> => {
    const res = await fetch(`${API_URL}/files/list`, {
      headers: { "Content-Type": "application/json", ...authHeader() },
    });
    return res.json();
  },

  // GET /api/files/download/:fileId  (protected + ownership check on server)
  downloadFile: async (fileId: number): Promise<Blob> => {
    const res = await fetch(`${API_URL}/files/download/${fileId}`, {
      headers: authHeader(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || "Download failed");
    }
    return res.blob();
  },

  // GET /api/logs  (protected)
  getLogs: async (): Promise<AuditLog[]> => {
    const res = await fetch(`${API_URL}/logs`, {
      headers: { "Content-Type": "application/json", ...authHeader() },
    });
    return res.json();
  },

  // GET /api/users/list  (protected — server excludes current user via token)
  getUsersList: async (): Promise<User[]> => {
    const res = await fetch(`${API_URL}/users/list`, {
      headers: { "Content-Type": "application/json", ...authHeader() },
    });
    return res.json();
  },

  // POST /api/files/share  (protected — fromUserId is taken from JWT on server)
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
    return res.json();
  },

  // GET /api/files/shared  (protected — server uses token for userId)
  getSharedFiles: async (): Promise<SharedFile[]> => {
    const res = await fetch(`${API_URL}/files/shared`, {
      headers: { "Content-Type": "application/json", ...authHeader() },
    });
    return res.json();
  },
};
