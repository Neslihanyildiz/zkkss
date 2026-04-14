// src/lib/types.ts

export type UserRole = "user" | "admin" | "system_manager";

export interface User {
  id: number;
  username: string;
  public_key?: string;
  role?: UserRole;
}

export interface FileData {
  id: number;
  filename: string;
  upload_date: string;
  /** Recipient-specific wrapped AES key stored in file_shares (null if missing) */
  encrypted_key: string | null;
  original_name?: string;
  mimetype?: string;
  size?: number;
  owner_id?: number;
  createdAt?: string;
}

export interface SharedFile {
  id: number;
  filename: string;
  sender_name: string;
  encrypted_key: string;
  upload_date: string;
  from_user_id?: number;
  to_user_id?: number;
}

export interface AuditLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}
