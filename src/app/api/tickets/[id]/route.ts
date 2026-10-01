import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { sendStatusChangeEmail, sendTicketAssignedEmail } from "@/lib/email";

// GET /api/tickets/[id] — get single ticket with all details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      requester: { select: { id: true, name: true, email: true, designation: true, department: true } },
      assignee: { select: { id: true, name: true, email: true, designation: true } },
      attachments: true,
      comments: {
        include: {
          author: { select: { id: true, name: true, role: true, designation: true } },
          attachments: true,
        },
        orderBy: { createdAt: "desc" },
      },
      auditLogs: {
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Access control: requesters can only view their own tickets
  if (user.role === "requester" && ticket.requesterId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Filter internal notes and internal audit logs for requesters
  if (user.role === "requester") {
    ticket.comments = ticket.comments.filter((c) => !c.isInternal);
    ticket.auditLogs = ticket.auditLogs.filter((a) => a.action !== "internal_note");
  }

  return NextResponse.json(ticket);
}

// PATCH /api/tickets/[id] — update ticket (status, assignment, category)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;
  const body = await req.json();

  // Security check: immutable snapshot fields cannot be edited via API
  const immutableFields = [
    "nameSnapshot",
    "emailSnapshot",
    "designationSnapshot",
    "departmentSnapshot",
    "ticketNo",
    "requesterId",
    "id",
    "createdAt",
  ];
  const attemptedForbiddenFields = immutableFields.filter((f) => f in body);
  if (attemptedForbiddenFields.length > 0) {
    return NextResponse.json(
      { error: `Forbidden: Immutable fields cannot be modified: ${attemptedForbiddenFields.join(", ")}` },
      { status: 400 }
    );
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Access control: requesters can only access their own tickets
  if (user.role === "requester" && ticket.requesterId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Strict requester role restrictions
  if (user.role === "requester") {
    // Requesters cannot reassign, change category, or change priority
    if (body.assigneeId !== undefined || body.categoryId !== undefined || body.priority !== undefined) {
      return NextResponse.json(
        { error: "Forbidden: Requesters cannot change assignment, category, or priority" },
        { status: 403 }
      );
    }
    // Requesters can only cancel or reopen
    if (body.status) {
      const allowedRequesterTransitions: Record<string, string[]> = {
        New: ["Cancelled"],
        Assigned: ["Cancelled"],
        Resolved: ["Closed", "Assigned"], // close or reopen
      };
      const allowed = allowedRequesterTransitions[ticket.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { error: `Forbidden: Cannot transition from ${ticket.status} to ${body.status} as requester` },
          { status: 403 }
        );
      }
    }
  }

  const updates: any = {};
  const auditEntries: any[] = [];

  // Status change
  if (body.status && body.status !== ticket.status) {
    const oldStatus = ticket.status;
    updates.status = body.status;

    if (body.status === "Resolved") {
      updates.resolvedAt = new Date();
    }
    if (body.status === "Closed") {
      updates.closedAt = new Date();
    }

    auditEntries.push({
      ticketId: id,
      action: "status_change",
      fromStatus: oldStatus,
      toStatus: body.status,
      actorId: user.id,
    });

    // Email requester on status change
    sendStatusChangeEmail(
      ticket.emailSnapshot,
      ticket.nameSnapshot,
      { ticketNo: ticket.ticketNo, description: ticket.description },
      body.status
    ).catch(console.error);
  }

  // Assignment
  if (body.assigneeId !== undefined) {
    updates.assigneeId = body.assigneeId;
    if (body.assigneeId && ticket.status === "New") {
      updates.status = "Assigned";
      auditEntries.push({
        ticketId: id,
        action: "status_change",
        fromStatus: ticket.status,
        toStatus: "Assigned",
        actorId: user.id,
      });
    }

    auditEntries.push({
      ticketId: id,
      action: "assigned",
      actorId: user.id,
      details: JSON.stringify({ assigneeId: body.assigneeId }),
    });

    // Email the assigned agent
    if (body.assigneeId) {
      const agent = await prisma.user.findUnique({ where: { id: body.assigneeId } });
      if (agent) {
        sendTicketAssignedEmail(agent.email, agent.name, {
          ticketNo: ticket.ticketNo,
          description: ticket.description,
        }).catch(console.error);
      }
    }
  }

  // Category re-route
  if (body.categoryId !== undefined) {
    updates.categoryId = body.categoryId;
    auditEntries.push({
      ticketId: id,
      action: "category_change",
      actorId: user.id,
      details: JSON.stringify({ categoryId: body.categoryId }),
    });
  }

  // Priority change
  if (body.priority && body.priority !== ticket.priority) {
    updates.priority = body.priority;
    auditEntries.push({
      ticketId: id,
      action: "priority_change",
      actorId: user.id,
      details: JSON.stringify({ from: ticket.priority, to: body.priority }),
    });
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id },
    data: updates,
  });

  // Create audit logs
  if (auditEntries.length > 0) {
    await prisma.auditLog.createMany({ data: auditEntries });
  }

  return NextResponse.json(updatedTicket);
}
