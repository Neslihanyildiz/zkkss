// src/app/dashboard/layout.tsx
"use client";

import { ReactNode, useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
  shared?: ReactNode;
  activity?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();

  const isAuthenticated = useSyncExternalStore(
    () => () => {},
    () => !!localStorage.getItem("user"),
    () => false,
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-navy-900 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-light flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
