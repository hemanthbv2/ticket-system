"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import TicketStepper from "@/components/TicketStepper";
import {
  InboxIcon,
  FilterIcon,
  UserIcon,
  TagIcon,
  ClockIcon,
  AlertTriangleIcon,
  UserPlusIcon,
  SearchIcon,
} from "lucide-react";

type Ticket = {
  id: string;
  ticketNo: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  nameSnapshot: string;
  designationSnapshot: string;
  departmentSnapshot: string;
  category?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
  isEscalated?: boolean;
  escalationLevel?: number;
  requiresApproval?: boolean;
  approvalStatus?: string | null;
  _count: { comments: number };
};

const priorityOrder: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

const priorityColors: Record<string, string> = {
  Low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  Medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Urgent: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse",
};

export default function AgentQueuePage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const user = session?.user as any;

  useEffect(() => {
    if (!session || user?.role === "requester") return;
    fetchTickets();
  }, [session, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);

    const res = await fetch(`/api/tickets?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTickets(data.sort((a: Ticket, b: Ticket) =>
        (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
      ));
    }
    setLoading(false);
  };

  const assignToMe = async (ticketId: string) => {
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: user.id }),
    });
    if (res.ok) fetchTickets();
  };

  const filtered = tickets.filter((t) => {
    if (assignmentFilter === "mine" && t.assignee?.id !== user?.id) return false;
    if (assignmentFilter === "unassigned" && t.assignee) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.ticketNo.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.nameSnapshot.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusOptions = ["all", "New", "Assigned", "In Progress", "Waiting on Requester", "Resolved"];
  const counts = {
    total: tickets.length,
    unassigned: tickets.filter((t) => !t.assignee).length,
    mine: tickets.filter((t) => t.assignee?.id === user?.id).length,
    urgent: tickets.filter((t) => t.priority === "Urgent").length,
  };

  if (user?.role === "requester") {
    return (
      <div className="glass-card p-12 text-center max-w-md mx-auto my-12 animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <AlertTriangleIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">403 Forbidden</h2>
        <p className="text-sm text-slate-400 mb-6">
          Requesters are not permitted to access the Agent Queue.
        </p>
        <Link href="/tickets" className="btn-primary text-xs py-2 px-4 inline-block">
          Return to My Tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <InboxIcon className="w-6 h-6 text-indigo-400" />
          Agent Queue
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage and respond to tickets</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: counts.total, color: "from-indigo-500 to-blue-500" },
          { label: "Unassigned", value: counts.unassigned, color: "from-amber-500 to-orange-500" },
          { label: "My Tickets", value: counts.mine, color: "from-emerald-500 to-teal-500" },
          { label: "Urgent", value: counts.urgent, color: "from-red-500 to-pink-500" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className={`text-2xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 py-1 px-1">Assignment:</span>
          {["all", "unassigned", "mine"].map((f) => (
            <button
              key={f}
              onClick={() => setAssignmentFilter(f)}
              className={`chip text-xs ${assignmentFilter === f ? "chip-active" : "chip-inactive"}`}
            >
              {f === "all" ? "All" : f === "mine" ? "My Tickets" : "Unassigned"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 py-1 px-1">Status:</span>
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`chip text-xs ${statusFilter === s ? "chip-active" : "chip-inactive"}`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 py-1 px-1">Priority:</span>
          {["all", "Urgent", "High", "Medium", "Low"].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`chip text-xs ${priorityFilter === p ? "chip-active" : "chip-inactive"}`}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card shimmer h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <InboxIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-400">Queue is empty</h3>
          <p className="text-sm text-slate-600">No tickets match your filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => (
            <div key={ticket.id} className="glass-card glass-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link href={`/tickets/${ticket.id}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-indigo-400 font-semibold">{ticket.ticketNo}</span>
                  <span className={`badge border ${priorityColors[ticket.priority]}`}>{ticket.priority}</span>
                  {ticket.category && (
                    <span className="badge bg-slate-700/50 text-slate-400 text-[10px]">{ticket.category.name}</span>
                  )}
                  {ticket.isEscalated && (
                    <span className="badge bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-semibold">
                      ⚡ Tier {ticket.escalationLevel || 2} Escalated
                    </span>
                  )}
                  {ticket.requiresApproval && ticket.approvalStatus === "Pending" && (
                    <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                      ⏳ Needs Approval
                    </span>
                  )}
                  {ticket.requiresApproval && ticket.approvalStatus === "Approved" && (
                    <span className="badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                      ✓ Approved
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-200 truncate">{ticket.description}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    {ticket.nameSnapshot} · {ticket.designationSnapshot}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-28">
                  <TicketStepper status={ticket.status} compact />
                </div>
                {!ticket.assignee && (
                  <button
                    onClick={() => assignToMe(ticket.id)}
                    className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 whitespace-nowrap"
                  >
                    <UserPlusIcon className="w-3.5 h-3.5" />
                    Assign to me
                  </button>
                )}
                {ticket.assignee && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    {ticket.assignee.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
