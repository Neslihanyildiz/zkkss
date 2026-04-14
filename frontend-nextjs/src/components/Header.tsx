// src/components/Header.tsx
"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-navy-100 shadow-navy-sm">
      <div className="px-8 py-6 flex items-center justify-between">
        {/* Left Side - Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-navy-900">
            <div className="text-2xl">🔒</div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">ZK Storage</h1>
            <p className="text-xs text-navy-600">Zero-Knowledge Encryption</p>
          </div>
        </div>

        {/* Right Side - User Info & Logout */}
        <div className="flex items-center gap-6">
          {/* User Profile */}
          <div className="flex items-center gap-3 px-4 py-2 bg-navy-50 rounded-lg">
            <div className="p-2 rounded-full bg-navy-200">
              <User className="w-5 h-5 text-navy-900" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy-900">
                {user?.username}
              </p>
              <p className="text-xs text-navy-600">ID: {user?.id}</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
