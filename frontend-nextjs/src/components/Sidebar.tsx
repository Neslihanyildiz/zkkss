// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Share2, Activity } from "lucide-react";

const navItems = [
  {
    name: "Files",
    href: "/dashboard",
    icon: FileText,
    label: "My Files",
  },
  {
    name: "Shared",
    href: "/dashboard/shared",
    icon: Share2,
    label: "Shared with Me",
  },
  {
    name: "Activity",
    href: "/dashboard/activity",
    icon: Activity,
    label: "Activity Log",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-navy-900 text-white shadow-navy-lg flex flex-col">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white">
            <span className="text-2xl">🔐</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">ZK Storage</h2>
            <p className="text-xs text-navy-300">Secure Files</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard" && pathname === "/dashboard");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? "bg-white text-navy-900 shadow-lg"
                  : "text-navy-100 hover:bg-navy-800 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <div>
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-xs opacity-75">{item.label}</p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-4 h-px bg-navy-800"></div>

      {/* Info Box */}
      <div className="p-4 mx-4 bg-navy-800 rounded-lg border border-navy-700">
        <div className="flex items-start gap-2">
          <div className="text-2xl">ℹ️</div>
          <div>
            <p className="text-sm font-semibold mb-1">Zero-Knowledge</p>
            <p className="text-xs text-navy-300">
              All files are encrypted end-to-end. Only you can access them.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto mx-4 mb-4 p-4 bg-navy-800 rounded-lg border border-navy-700">
        <p className="text-xs text-navy-300 text-center">🔒 Secure by Design</p>
      </div>
    </aside>
  );
}
