"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import TicketStepper from "@/components/TicketStepper";
import {
  PlusCircleIcon,
  SearchIcon,
  FilterIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  AlertTriangleIcon,
  ImageIcon,
  MessageSquareIcon,
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
  category?: { id: string; name: string } | null;
  assignee?: { id: string; name: string } | null;
  attachments: any[];
  _count: { comments: number };
};

const priorityColors: Record<string, string> = {
  Low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  Medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors: Record<string, string> = {
  New: "bg-blue-500/20 text-blue-400",
  Assigned: "bg-indigo-500/20 text-indigo-400",
  "In Progress": "bg-yellow-500/20 text-yellow-400",
  "Waiting on Requester": "bg-amber-500/20 text-amber-400",
  Resolved: "bg-green-500/20 text-green-400",
  Closed: "bg-gray-500/20 text-gray-400",
  Cancelled: "bg-red-500/20 text-red-400",
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const user = session?.user as any;
  const isRequester = user?.role === "requester";

  useEffect(() => {
    if (!session) return;
    fetchTickets();
  }, [session, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);

    const res = await fetch(`/api/tickets?${params}`);
    if (res.ok) {
      setTickets(await res.json());
    }
    setLoading(false);
  };

  const filtered = tickets.filter((t) =>
    search
      ? t.ticketNo.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.nameSnapshot.toLowerCase().includes(search.toLowerCase())
      : true
  );

  const statusOptions = ["all", "New", "Assigned", "In Progress", "Waiting on Requester", "Resolved", "Closed"];
  const priorityOptions = ["all", "Low", "Medium", "High", "Urgent"];

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {user?.role === "media_head" ? "All Media Cell Tickets" : "My Tickets"}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        {(isRequester || user?.role === "media_head") && (
          <Link href="/tickets/new" className="btn-primary flex items-center gap-2 w-fit">
            <PlusCircleIcon className="w-4 h-4" />
            New Ticket
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 space-y-3">
        {/* Search */}
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

        {/* Filter chips */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-slate-500 py-1 px-1 flex items-center gap-1">
              <FilterIcon className="w-3 h-3" /> Status:
            </span>
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
            <span className="text-xs text-slate-500 py-1 px-1 flex items-center gap-1">
              <AlertTriangleIcon className="w-3 h-3" /> Priority:
            </span>
            {priorityOptions.map((p) => (
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
      </div>

      {/* Ticket List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 shimmer h-24 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <TagIcon className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-400 mb-1">No tickets found</h3>
          <p className="text-sm text-slate-600">
            {isRequester ? "Create your first ticket to get started." : "No tickets match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket, idx) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="glass-card glass-card-hover p-4 block"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Thumbnail */}
                <div className="hidden sm:flex w-12 h-12 rounded-xl bg-slate-800 items-center justify-center flex-shrink-0 overflow-hidden">
                  {ticket.attachments.length > 0 && ticket.attachments[0].fileUrl ? (
                    <img
                      src={ticket.attachments[0].fileUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-indigo-400 font-semibold">{ticket.ticketNo}</span>
                    <span className={`badge border ${priorityColors[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                    <span className={`badge ${statusColors[ticket.status]}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 mt-1 truncate">{ticket.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    {!isRequester && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {ticket.nameSnapshot}
                      </span>
                    )}
                    {ticket.category && (
                      <span className="flex items-center gap-1">
                        <TagIcon className="w-3 h-3" />
                        {ticket.category.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    {ticket._count.comments > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquareIcon className="w-3 h-3" />
                        {ticket._count.comments}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mini Progress Bar */}
                <div className="w-full sm:w-32 flex-shrink-0">
                  <TicketStepper status={ticket.status} compact />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
