"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  TicketIcon,
  PlusCircleIcon,
  LayoutDashboardIcon,
  InboxIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/tickets", label: "My Tickets", icon: TicketIcon, roles: ["requester", "media_head", "agent", "admin"] },
  { href: "/tickets/new", label: "New Ticket", icon: PlusCircleIcon, roles: ["requester", "media_head"] },
  { href: "/queue", label: "Agent Queue", icon: InboxIcon, roles: ["agent", "admin"] },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon, roles: ["media_head", "admin"] },
  { href: "/admin", label: "Admin", icon: SettingsIcon, roles: ["admin"] },
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!session?.user) return null;

  const user = session.user as any;
  const role = user.role || "requester";
  const filteredNav = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      {/* Desktop/Tablet Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/5" style={{ borderRadius: 0 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/tickets" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                <TicketIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent hidden sm:block">
                TicketFlow
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {filteredNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-500/20 text-indigo-300 shadow-inner"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-slate-200">{user.name}</span>
                <span className="text-xs text-slate-500 capitalize">{role.replace("_", " ")}</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                {user.name?.charAt(0) || <UserIcon className="w-4 h-4" />}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-400 transition-colors px-2 py-1.5"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>

              {/* Mobile menu button */}
              <button
                className="md:hidden p-2 text-slate-400 hover:text-white"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Nav Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-72 glass-card animate-slide-in" style={{ borderRadius: "16px 0 0 16px" }}>
            <div className="p-6 pt-20">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-base font-bold text-white">
                  {user.name?.charAt(0)}
                </div>
                <div>
                  <div className="font-medium text-slate-200">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.designation}</div>
                </div>
              </div>

              <div className="space-y-1">
                {filteredNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOutIcon className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
    </>
  );
}
