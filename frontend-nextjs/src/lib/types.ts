// src/lib/types.ts

export interface User {
  id: number;
  username: string;
  public_key?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export interface FileData {
  id: number;
  filename: string;
  original_name?: string;
  mimetype?: string;
  size?: number;
  owner_id: number;
  upload_date: string;
  createdAt?: string;
}

export interface SharedFile extends FileData {
  sender_name: string;
  encrypted_key: string;
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

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface ShareData {
  fileId: number;
  fromUserId: number;
  toUserId: number;
  encryptedKey: string;
}
