"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import TicketStepper from "@/components/TicketStepper";
import {
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  TagIcon,
  CalendarIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
  SendIcon,
  LockIcon,
  ZoomInIcon,
  XIcon,
  CheckCircleIcon,
  XCircleIcon,
  ActivityIcon,
  ShieldCheckIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Ticket = {
  id: string;
  ticketNo: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  nameSnapshot: string;
  designationSnapshot: string;
  departmentSnapshot: string;
  emailSnapshot: string;
  managerNameSnapshot: string | null;
  managerEmailSnapshot: string | null;
  isEscalated: boolean;
  escalatedAt: string | null;
  escalationReason: string | null;
  escalationLevel: number;
  requiresApproval: boolean;
  approvalStatus: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  approvedBy?: { id: string; name: string; email: string; designation: string } | null;
  category: { id: string; name: string } | null;
  requester: {
    id: string;
    name: string;
    email: string;
    designation: string;
    department: string;
    manager?: { id: string; name: string; email: string; designation: string } | null;
  };
  assignee: { id: string; name: string; email: string; designation: string } | null;
  attachments: { id: string; fileUrl: string; fileName: string; mime: string; commentId: string | null }[];
  comments: {
    id: string;
    body: string;
    isInternal: boolean;
    createdAt: string;
    author: { id: string; name: string; role: string; designation: string };
    attachments: { id: string; fileUrl: string; fileName: string; mime: string }[];
  }[];
  auditLogs: {
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    details: string | null;
    createdAt: string;
    actor: { id: string; name: string; role: string };
  }[];
};

const priorityColors: Record<string, string> = {
  Low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  Medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  High: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const actionLabels: Record<string, string> = {
  created: "created this ticket",
  status_change: "changed status",
  assigned: "assigned the ticket",
  category_change: "changed category",
  priority_change: "changed priority",
  comment_added: "added a comment",
  internal_note: "added an internal note",
  ticket_approved: "approved the request",
  ticket_rejected: "rejected the request",
  ticket_escalated: "escalated the ticket",
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  // Approval state
  const [approvalNotes, setApprovalNotes] = useState("");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Escalation state
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [submittingEscalate, setSubmittingEscalate] = useState(false);

  const user = session?.user as any;
  const isAgent = user?.role === "agent" || user?.role === "admin";
  const isManagerOrAdmin = user?.role === "media_head" || user?.role === "admin";

  useEffect(() => {
    fetchTicket();
  }, [resolvedParams.id]);

  const fetchTicket = async () => {
    const res = await fetch(`/api/tickets/${resolvedParams.id}`);
    if (res.ok) {
      setTicket(await res.json());
      setErrorStatus(null);
    } else {
      setErrorStatus(res.status);
    }
    setLoading(false);
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSubmittingComment(true);

    const res = await fetch(`/api/tickets/${resolvedParams.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment, isInternal }),
    });

    if (res.ok) {
      setComment("");
      setIsInternal(false);
      fetchTicket();
    }
    setSubmittingComment(false);
  };

  const changeStatus = async (newStatus: string) => {
    setChangingStatus(true);
    const res = await fetch(`/api/tickets/${resolvedParams.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      fetchTicket();
    }
    setChangingStatus(false);
  };

  const assignToMe = async () => {
    const res = await fetch(`/api/tickets/${resolvedParams.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: user.id }),
    });
    if (res.ok) fetchTicket();
  };

  const handleApproval = async (status: "Approved" | "Rejected") => {
    setSubmittingApproval(true);
    const res = await fetch(`/api/tickets/${resolvedParams.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approvalStatus: status,
        approvalNotes: approvalNotes.trim() || undefined,
      }),
    });
    if (res.ok) {
      setApprovalNotes("");
      fetchTicket();
    }
    setSubmittingApproval(false);
  };

  const handleEscalate = async () => {
    if (!escalationReason.trim()) return;
    setSubmittingEscalate(true);
    const res = await fetch(`/api/tickets/${resolvedParams.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        escalate: true,
        escalationReason: escalationReason.trim(),
      }),
    });
    if (res.ok) {
      setShowEscalateModal(false);
      setEscalationReason("");
      fetchTicket();
    }
    setSubmittingEscalate(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="shimmer h-8 w-48 rounded-xl" />
        <div className="shimmer h-32 rounded-xl" />
        <div className="shimmer h-48 rounded-xl" />
      </div>
    );
  }

  if (errorStatus === 403) {
    return (
      <div className="glass-card p-12 text-center max-w-md mx-auto my-12 animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <LockIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">403 Forbidden</h2>
        <p className="text-sm text-slate-400 mb-6">
          You do not have permission to view this ticket. Requesters can only view tickets they created.
        </p>
        <button onClick={() => router.push("/tickets")} className="btn-primary text-xs py-2 px-4">
          Return to My Tickets
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="glass-card p-12 text-center max-w-md mx-auto my-12 animate-fade-in-up">
        <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4 border border-white/5">
          <TagIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Ticket Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">
          This ticket may have been removed or the link is invalid.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => router.back()} className="btn-secondary text-xs py-2 px-4">
            Go Back
          </button>
          <button onClick={() => router.push("/tickets")} className="btn-primary text-xs py-2 px-4">
            View All Tickets
          </button>
        </div>
      </div>
    );
  }

  const ticketImages = ticket.attachments.filter((a) => !a.commentId && a.mime.startsWith("image/"));
  const canChangeStatus = (() => {
    if (isAgent) {
      return ["New", "Assigned", "In Progress", "Waiting on Requester", "Resolved"].includes(ticket.status);
    }
    if (user?.role === "requester") {
      return ["New", "Assigned", "Resolved"].includes(ticket.status);
    }
    return false;
  })();

  const statusActions = (() => {
    if (isAgent) {
      const map: Record<string, { label: string; status: string; color: string }[]> = {
        New: [{ label: "Assign", status: "Assigned", color: "bg-indigo-500" }],
        Assigned: [{ label: "Start Work", status: "In Progress", color: "bg-yellow-500" }],
        "In Progress": [
          { label: "Wait on Requester", status: "Waiting on Requester", color: "bg-amber-500" },
          { label: "Resolve", status: "Resolved", color: "bg-green-500" },
        ],
        "Waiting on Requester": [{ label: "Resume", status: "In Progress", color: "bg-yellow-500" }],
        Resolved: [{ label: "Close", status: "Closed", color: "bg-gray-500" }],
      };
      return map[ticket.status] || [];
    }
    if (user?.role === "requester") {
      const map: Record<string, { label: string; status: string; color: string }[]> = {
        New: [{ label: "Cancel", status: "Cancelled", color: "bg-red-500" }],
        Assigned: [{ label: "Cancel", status: "Cancelled", color: "bg-red-500" }],
        Resolved: [
          { label: "Close", status: "Closed", color: "bg-gray-500" },
          { label: "Reopen", status: "Assigned", color: "bg-indigo-500" },
        ],
      };
      return map[ticket.status] || [];
    }
    return [];
  })();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Back + Header */}
      <div>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-3">
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{ticket.ticketNo}</h1>
            <span className={`badge border ${priorityColors[ticket.priority]} text-xs`}>
              {ticket.priority}
            </span>
            {ticket.isEscalated && (
              <span className="badge bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-semibold animate-pulse">
                ⚡ Tier {ticket.escalationLevel} Escalated
              </span>
            )}
            {ticket.requiresApproval && (
              <span className={`badge text-xs font-semibold border ${
                ticket.approvalStatus === "Approved"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : ticket.approvalStatus === "Rejected"
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-purple-500/20 text-purple-400 border-purple-500/30"
              }`}>
                {ticket.approvalStatus === "Approved" ? "✓ Manager Approved" : ticket.approvalStatus === "Rejected" ? "✕ Approval Rejected" : "⏳ Pending Manager Approval"}
              </span>
            )}
          </div>

          {/* Quick Escalation Button for Agents / Media Head / Admin */}
          {(isAgent || isManagerOrAdmin) && ticket.status !== "Closed" && ticket.status !== "Cancelled" && ticket.escalationLevel < 3 && (
            <button
              onClick={() => setShowEscalateModal(true)}
              className="text-xs px-3.5 py-2 rounded-xl font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <ArrowUpRightIcon className="w-3.5 h-3.5" />
              Escalate to Tier {ticket.escalationLevel + 1}
            </button>
          )}
        </div>
      </div>

      {/* Escalation Alert Banner */}
      {ticket.isEscalated && (
        <div className="glass-card p-4 rounded-2xl border-l-4 border-l-red-500 bg-red-500/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
            <AlertTriangleIcon className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-red-200">
                Ticket Escalated to Senior Hierarchy (Tier {ticket.escalationLevel})
              </h4>
              <span className="text-[10px] text-red-300/80">
                {ticket.escalatedAt ? formatDistanceToNow(new Date(ticket.escalatedAt), { addSuffix: true }) : ""}
              </span>
            </div>
            <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
              Reason: <strong>{ticket.escalationReason || "Escalated for immediate senior intervention."}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Approval Tier Card (Media Head / Admin Review) */}
      {ticket.requiresApproval && (
        <div className={`glass-card p-4.5 rounded-2xl border ${
          ticket.approvalStatus === "Approved"
            ? "border-emerald-500/30 bg-emerald-500/5"
            : ticket.approvalStatus === "Rejected"
            ? "border-red-500/30 bg-red-500/5"
            : "border-purple-500/30 bg-purple-500/10"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                ticket.approvalStatus === "Approved"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : ticket.approvalStatus === "Rejected"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-purple-500/20 text-purple-400"
              }`}>
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Tier 2 Manager Review & Sign-Off
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  {ticket.approvalStatus === "Approved" ? (
                    <>Approved by <span className="font-semibold text-emerald-300">{ticket.approvedBy?.name || "Media Head"}</span>{ticket.approvalNotes ? ` — "${ticket.approvalNotes}"` : ""}</>
                  ) : ticket.approvalStatus === "Rejected" ? (
                    <>Rejected by <span className="font-semibold text-red-300">{ticket.approvedBy?.name || "Media Head"}</span>{ticket.approvalNotes ? ` — "${ticket.approvalNotes}"` : ""}</>
                  ) : (
                    <>Pending authorization by reporting manager <span className="text-purple-300 font-medium">({ticket.managerNameSnapshot || "Arjun Mehta - Head of Media Cell"})</span></>
                  )}
                </p>
              </div>
            </div>

            {/* Approval Action Form (Only for Media Head or Admin if Pending) */}
            {isManagerOrAdmin && ticket.approvalStatus === "Pending" && (
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Approval notes / budget code (optional)"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="input-field text-xs py-1.5 px-3 min-w-[240px]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproval("Approved")}
                    disabled={submittingApproval}
                    className="btn-primary text-xs py-1.5 px-3 flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval("Rejected")}
                    disabled={submittingApproval}
                    className="text-xs py-1.5 px-3 rounded-xl font-semibold text-red-300 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 flex-1 flex items-center justify-center gap-1.5"
                  >
                    <XCircleIcon className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress Stepper */}
      <div className="glass-card p-5">
        <TicketStepper status={ticket.status} />

        {/* Status Actions */}
        {canChangeStatus && statusActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
            {isAgent && !ticket.assignee && ticket.status === "New" && (
              <button onClick={assignToMe} className="btn-primary text-xs py-2 px-4" disabled={changingStatus}>
                Assign to Me
              </button>
            )}
            {statusActions.map((action) => (
              <button
                key={action.status}
                onClick={() => changeStatus(action.status)}
                disabled={changingStatus}
                className={`text-xs py-2 px-4 rounded-xl font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 ${action.color}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Info + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">Description</h3>
            <p className="text-slate-200 text-sm leading-relaxed">{ticket.description}</p>
          </div>

          {/* Photos */}
          {ticketImages.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                Photos ({ticketImages.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ticketImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-video rounded-xl overflow-hidden bg-slate-800 cursor-pointer group"
                    onClick={() => setZoomImage(img.fileUrl)}
                  >
                    <img
                      src={img.fileUrl}
                      alt={img.fileName}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomInIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <MessageSquareIcon className="w-4 h-4" />
              Comments ({ticket.comments.length})
            </h3>

            {/* Comment input */}
            <div className="space-y-2 mb-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write an update or reply..."
                rows={3}
                className="input-field resize-none"
              />
              <div className="flex items-center justify-between">
                {isAgent && (
                  <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    <LockIcon className="w-3 h-3 text-amber-500" />
                    Internal note (not visible to requester)
                  </label>
                )}
                <button
                  onClick={submitComment}
                  disabled={submittingComment || !comment.trim()}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 ml-auto disabled:opacity-50"
                >
                  {submittingComment ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <SendIcon className="w-3.5 h-3.5" />
                  )}
                  Send
                </button>
              </div>
            </div>

            {/* Comment thread */}
            <div className="space-y-3">
              {ticket.comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl ${
                    c.isInternal
                      ? "bg-amber-500/5 border border-amber-500/20"
                      : c.author.id === ticket.requester.id
                      ? "bg-slate-800/50 border border-white/5"
                      : "bg-indigo-500/5 border border-indigo-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                      c.author.role === "agent" ? "bg-emerald-600" : c.author.role === "admin" ? "bg-orange-600" : c.author.role === "media_head" ? "bg-purple-600" : "bg-indigo-600"
                    }`}>
                      {c.author.name.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-slate-300">{c.author.name}</span>
                    <span className="text-[10px] text-slate-600">{c.author.designation}</span>
                    {c.isInternal && (
                      <span className="badge bg-amber-500/20 text-amber-400 text-[9px]">
                        <LockIcon className="w-2.5 h-2.5 mr-0.5 inline" />
                        Internal
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 pl-8">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Hierarchy & Reporting Line Card */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-1">
              🏛️ Hierarchy & Routing
            </h3>

            <div className="relative pl-5 space-y-4 border-l border-indigo-500/30 ml-2 py-1 text-xs">
              {/* Requester */}
              <div className="relative">
                <div className="absolute -left-[25px] top-0.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-900" />
                <p className="text-slate-500 text-[10px] uppercase font-semibold">Requester</p>
                <p className="text-slate-200 font-medium">{ticket.nameSnapshot}</p>
                <p className="text-slate-400 text-[11px]">{ticket.designationSnapshot} • {ticket.departmentSnapshot}</p>
              </div>

              {/* Reporting Manager */}
              <div className="relative">
                <div className="absolute -left-[25px] top-0.5 w-3 h-3 rounded-full bg-purple-500 ring-4 ring-slate-900" />
                <p className="text-slate-500 text-[10px] uppercase font-semibold">Reporting Manager</p>
                <p className="text-purple-300 font-medium">
                  {ticket.managerNameSnapshot || ticket.requester.manager?.name || "Arjun Mehta"}
                </p>
                <p className="text-slate-400 text-[11px]">
                  {ticket.requester.manager?.designation || "Head of Media Cell"}
                </p>
              </div>

              {/* Assigned Support Specialist */}
              <div className="relative">
                <div className={`absolute -left-[25px] top-0.5 w-3 h-3 rounded-full ${ticket.assignee ? "bg-emerald-500" : "bg-slate-600"} ring-4 ring-slate-900`} />
                <p className="text-slate-500 text-[10px] uppercase font-semibold">Assigned Specialist</p>
                <p className="text-slate-200 font-medium">
                  {ticket.assignee ? ticket.assignee.name : "Unassigned Queue"}
                </p>
                <p className="text-slate-400 text-[11px]">
                  {ticket.assignee?.designation || (ticket.category?.name ? `${ticket.category.name} Team` : "General Support")}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket metadata */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-400 mb-1">Details</h3>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5"><TagIcon className="w-3.5 h-3.5" /> Category</span>
                <span className="text-slate-300 text-xs">{ticket.category?.name || "Unassigned"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" /> Created</span>
                <span className="text-slate-400 text-xs">
                  {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {ticket.dueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5"><CalendarIcon className="w-3.5 h-3.5" /> Due</span>
                  <span className="text-slate-300 text-xs">
                    {new Date(ticket.dueDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5"><CheckCircleIcon className="w-3.5 h-3.5 text-green-500" /> Resolved</span>
                  <span className="text-green-400 text-xs">
                    {new Date(ticket.resolvedAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <ActivityIcon className="w-4 h-4" />
              Activity Log
            </h3>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {ticket.auditLogs.map((log) => (
                <div key={log.id} className="flex gap-2.5 text-xs">
                  <div className="flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${
                      log.action === "created" ? "bg-blue-500" :
                      log.action === "status_change" ? "bg-indigo-500" :
                      log.action === "assigned" ? "bg-emerald-500" :
                      log.action === "ticket_escalated" ? "bg-red-500" :
                      log.action === "ticket_approved" ? "bg-teal-500" :
                      "bg-slate-600"
                    }`} />
                    <div className="w-px flex-1 bg-slate-700/50 mt-1" />
                  </div>
                  <div className="pb-3">
                    <p className="text-slate-400">
                      <span className="text-slate-300 font-medium">{log.actor.name}</span>{" "}
                      {actionLabels[log.action] || log.action}
                      {log.fromStatus && log.toStatus && (
                        <span className="text-slate-500">
                          {" "}
                          <span className="text-slate-500">{log.fromStatus}</span>
                          {" → "}
                          <span className="text-indigo-400">{log.toStatus}</span>
                        </span>
                      )}
                    </p>
                    <span className="text-slate-600">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-bold text-white">Escalate Ticket to Tier {ticket.escalationLevel + 1}</h3>
              </div>
              <button onClick={() => setShowEscalateModal(false)} className="text-slate-400 hover:text-white">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Escalating routes this ticket to higher supervisory authorities (Media Head / IT Director) with high-priority SLA tracking.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                Escalation Justification <span className="text-red-400">*</span>
              </label>
              <textarea
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="e.g. Blocked transmission deadline, hardware spare part delay..."
                rows={3}
                className="input-field text-xs resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEscalateModal(false)}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalate}
                disabled={submittingEscalate || !escalationReason.trim()}
                className="text-xs py-2 px-4 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
              >
                {submittingEscalate ? "Escalating..." : "Confirm Escalation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setZoomImage(null)}
        >
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <XIcon className="w-6 h-6 text-white" />
          </button>
          <img
            src={zoomImage}
            alt="Zoomed view"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
