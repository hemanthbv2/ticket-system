"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  SettingsIcon,
  UsersIcon,
  TagIcon,
  PlusCircleIcon,
  EditIcon,
  TrashIcon,
  ShieldIcon,
  SearchIcon,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  designation: string;
  department: string;
};

type Category = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
};

export default function AdminPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"users" | "categories">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;

  useEffect(() => {
    Promise.all([
      fetch("/api/dev/users").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([u, c]) => {
        setUsers(u);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);

  const roleColors: Record<string, string> = {
    requester: "bg-blue-500/20 text-blue-400",
    media_head: "bg-purple-500/20 text-purple-400",
    agent: "bg-emerald-500/20 text-emerald-400",
    admin: "bg-orange-500/20 text-orange-400",
  };

  const filteredUsers = users.filter(
    (u) =>
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (user?.role !== "admin") {
    return (
      <div className="glass-card p-12 text-center max-w-md mx-auto my-12 animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <ShieldIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">403 Forbidden</h2>
        <p className="text-sm text-slate-400 mb-6">
          Only administrators can access the Admin Panel.
        </p>
        <a href="/tickets" className="btn-primary text-xs py-2 px-4 inline-block">
          Return to My Tickets
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-orange-400" />
          Admin Panel
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage users, categories, and routing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "users" ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <UsersIcon className="w-4 h-4" />
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "categories" ? "bg-indigo-500/20 text-indigo-300" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <TagIcon className="w-4 h-4" />
          Categories ({categories.length})
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium hidden sm:table-cell">Email</th>
                    <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium hidden md:table-cell">Designation</th>
                    <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium">Role</th>
                    <th className="text-left py-3 px-4 text-xs text-slate-500 font-medium hidden md:table-cell">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          <span className="text-slate-200 font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 hidden sm:table-cell">{u.email}</td>
                      <td className="py-3 px-4 text-slate-400 hidden md:table-cell">{u.designation}</td>
                      <td className="py-3 px-4">
                        <span className={`badge ${roleColors[u.role]}`}>
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 hidden md:table-cell">{u.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-200">{cat.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{cat.description || "No description"}</p>
              </div>
              <span className={`badge ${cat.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {cat.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
