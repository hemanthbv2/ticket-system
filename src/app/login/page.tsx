"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TicketIcon, LogInIcon, UserIcon, ChevronDownIcon, ShieldIcon } from "lucide-react";

type DevUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  designation: string;
  department: string;
};

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [devUsers, setDevUsers] = useState<DevUser[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      router.push("/tickets");
    }
  }, [session, router]);

  useEffect(() => {
    // Load dev users
    fetch("/api/dev/users")
      .then((r) => r.json())
      .then(setDevUsers)
      .catch(() => {});
  }, []);

  const handleDevLogin = async (email: string) => {
    setLoading(true);
    const result = await signIn("dev-login", {
      email,
      redirect: false,
    });
    if (result?.ok) {
      router.push("/tickets");
    }
    setLoading(false);
  };

  const roleColors: Record<string, string> = {
    requester: "from-blue-500 to-indigo-500",
    media_head: "from-purple-500 to-pink-500",
    agent: "from-emerald-500 to-teal-500",
    admin: "from-orange-500 to-red-500",
  };

  const roleLabels: Record<string, string> = {
    requester: "Requester",
    media_head: "Media Head",
    agent: "Agent",
    admin: "Admin",
  };

  const roles = ["all", "requester", "media_head", "agent", "admin"];
  const filteredUsers = selectedRole === "all" ? devUsers : devUsers.filter((u) => u.role === selectedRole);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Hero */}
      <div className="text-center mb-8 animate-fade-in-up">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/30">
          <TicketIcon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          TicketFlow
        </h1>
        <p className="text-slate-500 text-sm sm:text-base">
          Media Cell Support Portal
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md glass-card p-6 sm:p-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        {/* Google Login */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/tickets" })}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 rounded-xl py-3 px-4 font-semibold text-sm hover:bg-slate-100 transition-all mb-4 shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 text-xs text-slate-500 bg-[#1a1f35]">Development Mode</span>
          </div>
        </div>

        {/* Role filter chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`chip ${selectedRole === role ? "chip-active" : "chip-inactive"}`}
            >
              {role === "all" ? "All" : roleLabels[role] || role}
            </button>
          ))}
        </div>

        {/* Dev user list */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => handleDevLogin(user.email)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left group border border-transparent hover:border-white/10"
            >
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${roleColors[user.role] || roleColors.requester} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-200 truncate">{user.name}</div>
                <div className="text-xs text-slate-500 truncate">{user.designation} · {user.department}</div>
              </div>
              <span className={`badge text-[9px] bg-gradient-to-r ${roleColors[user.role] || ""} text-white flex-shrink-0`}>
                {roleLabels[user.role] || user.role}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs text-slate-600 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        Only registered organisation members can access this portal.
      </p>
    </div>
  );
}
