// src/components/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { FileText, Share2, Activity, ShieldCheck, Users } from "lucide-react";
import type { UserRole } from "@/lib/types";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  label: string;
  minRole?: UserRole; // undefined = all authenticated users
}

const NAV_ITEMS: NavItem[] = [
  { name: "Files",    href: "/dashboard",          icon: FileText,    label: "My Files"        },
  { name: "Shared",   href: "/dashboard/shared",   icon: Share2,      label: "Shared with Me"  },
  { name: "Activity", href: "/dashboard/activity", icon: Activity,    label: "Activity Log",   minRole: "admin" },
  { name: "Users",    href: "/dashboard/admin",    icon: Users,       label: "User Management", minRole: "admin" },
];

const ROLE_ORDER: Record<UserRole, number> = { user: 0, admin: 1, system_manager: 2 };

function hasAccess(userRole: UserRole, minRole?: UserRole): boolean {
  if (!minRole) return true;
  return ROLE_ORDER[userRole] >= ROLE_ORDER[minRole];
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case "system_manager": return { label: "Sys Manager", className: "bg-purple-600 text-white" };
    case "admin":          return { label: "Admin",       className: "bg-blue-600 text-white"   };
    default:               return { label: "User",        className: "bg-navy-700 text-navy-200" };
  }
}

export default function Sidebar() {
  const pathname = usePathname();

  const userRole = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const u = localStorage.getItem("user");
        return u ? (JSON.parse(u).role as UserRole) ?? "user" : "user";
      } catch { return "user"; }
    },
    () => "user" as UserRole,
  );

  const username = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u).username ?? "" : "";
      } catch { return ""; }
    },
    () => "",
  );

  const badge = getRoleBadge(userRole);
  const visibleItems = NAV_ITEMS.filter((item) => hasAccess(userRole, item.minRole));

  return (
    <aside className="w-64 bg-navy-900 text-white shadow-navy-lg flex flex-col">
      {/* Brand */}
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

      {/* Current user + role badge */}
      {username && (
        <div className="px-4 pt-4 pb-2 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {username[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{username}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 space-y-1 flex-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

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
              <Icon className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-xs opacity-75">{item.label}</p>
              </div>
              {item.minRole === "admin" && (
                <ShieldCheck className="w-3.5 h-3.5 ml-auto opacity-50 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Info box */}
      <div className="p-4 mx-4 mb-2 bg-navy-800 rounded-lg border border-navy-700">
        <div className="flex items-start gap-2">
          <div className="text-xl">ℹ️</div>
          <p className="text-xs text-navy-300 leading-relaxed">
            All files are end-to-end encrypted. Only you hold the key.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto mx-4 mb-4 p-3 bg-navy-800 rounded-lg border border-navy-700">
        <p className="text-xs text-navy-300 text-center">🔒 Secure by Design</p>
      </div>
    </aside>
  );
}
