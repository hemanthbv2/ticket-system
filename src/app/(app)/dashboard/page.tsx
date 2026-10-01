"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  LayoutDashboardIcon,
  TicketIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  UsersIcon,
  BarChart3Icon,
  DownloadIcon,
  TrendingUpIcon,
} from "lucide-react";

type Ticket = {
  id: string;
  ticketNo: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  resolvedAt: string | null;
  nameSnapshot: string;
  category?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const user = session?.user as any;

  useEffect(() => {
    if (!session || user?.role === "requester") return;
    fetch("/api/tickets")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTickets(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, user]);

  // Compute stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => !["Closed", "Cancelled"].includes(t.status)).length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
  const urgentOpen = tickets.filter((t) => t.priority === "Urgent" && !["Closed", "Cancelled"].includes(t.status)).length;

  // By status
  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // By priority
  const priorityCounts = tickets.reduce((acc, t) => {
    acc[t.priority] = (acc[t.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // By category
  const categoryCounts = tickets.reduce((acc, t) => {
    const cat = t.category?.name || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // By member
  const memberCounts = tickets.reduce((acc, t) => {
    acc[t.nameSnapshot] = (acc[t.nameSnapshot] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Average resolution time
  const resolvedWithTime = tickets.filter((t) => t.resolvedAt);
  const avgResolution = resolvedWithTime.length > 0
    ? resolvedWithTime.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime();
        const resolved = new Date(t.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0) / resolvedWithTime.length
    : 0;
  const avgHours = Math.round(avgResolution / (1000 * 60 * 60));

  // Overdue (created more than 3 days ago and still open)
  const overdue = useMemo(() => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return tickets.filter(
      (t) =>
        !["Closed", "Cancelled", "Resolved"].includes(t.status) &&
        new Date(t.createdAt).getTime() < threeDaysAgo
    ).length;
  }, [tickets]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Ticket No", "Description", "Status", "Priority", "Category", "Requester", "Created", "Resolved"];
    const rows = tickets.map((t) => [
      t.ticketNo,
      `"${t.description.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.category?.name || "",
      t.nameSnapshot,
      new Date(t.createdAt).toISOString(),
      t.resolvedAt ? new Date(t.resolvedAt).toISOString() : "",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const statusBarColors: Record<string, string> = {
    New: "bg-blue-500",
    Assigned: "bg-indigo-500",
    "In Progress": "bg-yellow-500",
    "Waiting on Requester": "bg-amber-500",
    Resolved: "bg-green-500",
    Closed: "bg-gray-500",
    Cancelled: "bg-red-500",
  };

  const priorityBarColors: Record<string, string> = {
    Low: "bg-slate-500",
    Medium: "bg-blue-500",
    High: "bg-orange-500",
    Urgent: "bg-red-500",
  };

  if (user?.role === "requester") {
    return (
      <div className="glass-card p-12 text-center max-w-md mx-auto my-12 animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <AlertTriangleIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">403 Forbidden</h2>
        <p className="text-sm text-slate-400 mb-6">
          Requesters are not permitted to access the Media Head Dashboard.
        </p>
        <Link href="/tickets" className="btn-primary text-xs py-2 px-4 inline-block">
          Return to My Tickets
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboardIcon className="w-6 h-6 text-purple-400" />
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Media Cell ticket overview</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 w-fit">
          <DownloadIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: TicketIcon, label: "Total Tickets", value: totalTickets, color: "from-indigo-500 to-blue-500", iconColor: "text-indigo-400" },
          { icon: AlertTriangleIcon, label: "Open", value: openTickets, color: "from-amber-500 to-orange-500", iconColor: "text-amber-400" },
          { icon: CheckCircleIcon, label: "Resolved", value: resolvedTickets, color: "from-emerald-500 to-green-500", iconColor: "text-emerald-400" },
          { icon: ClockIcon, label: "Avg Resolution", value: avgHours > 0 ? `${avgHours}h` : "—", color: "from-cyan-500 to-teal-500", iconColor: "text-cyan-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
              <span className="text-xs text-slate-500">{kpi.label}</span>
            </div>
            <div className={`text-2xl font-bold bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(urgentOpen > 0 || overdue > 0) && (
        <div className="flex flex-wrap gap-3">
          {urgentOpen > 0 && (
            <div className="glass-card p-3 px-4 border-l-4 border-l-red-500 flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300 font-medium">{urgentOpen} urgent ticket{urgentOpen > 1 ? "s" : ""} open</span>
            </div>
          )}
          {overdue > 0 && (
            <div className="glass-card p-3 px-4 border-l-4 border-l-amber-500 flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">{overdue} overdue ticket{overdue > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Status */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <BarChart3Icon className="w-4 h-4" />
            By Status
          </h3>
          <div className="space-y-2.5">
            {Object.entries(statusCounts).sort(([, a], [, b]) => b - a).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{status}</span>
                  <span className="text-slate-500">{count}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${statusBarColors[status] || "bg-slate-600"}`}
                    style={{ width: `${(count / totalTickets) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Priority */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <AlertTriangleIcon className="w-4 h-4" />
            By Priority
          </h3>
          <div className="space-y-2.5">
            {["Urgent", "High", "Medium", "Low"].map((p) => (
              <div key={p}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{p}</span>
                  <span className="text-slate-500">{priorityCounts[p] || 0}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${priorityBarColors[p]}`}
                    style={{ width: `${((priorityCounts[p] || 0) / totalTickets) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Category */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4" />
            By Category
          </h3>
          <div className="space-y-2.5">
            {Object.entries(categoryCounts).sort(([, a], [, b]) => b - a).map(([cat, count]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{cat}</span>
                  <span className="text-slate-500">{count}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-1000"
                    style={{ width: `${(count / totalTickets) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tickets per Member */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
            <UsersIcon className="w-4 h-4" />
            Tickets per Member
          </h3>
          <div className="space-y-2.5 max-h-52 overflow-y-auto">
            {Object.entries(memberCounts).sort(([, a], [, b]) => b - a).map(([name, count]) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {name.charAt(0)}
                </div>
                <span className="text-xs text-slate-400 flex-1 truncate">{name}</span>
                <span className="text-xs text-indigo-400 font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
