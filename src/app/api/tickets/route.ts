import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { sendTicketCreatedEmail } from "@/lib/email";

// GET /api/tickets — list tickets (filtered by role)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const category = searchParams.get("category");

  // Base filter
  const where: any = {};

  // Role-based filtering (server-side enforcement)
  if (user.role === "requester") {
    where.requesterId = user.id;
  } else if (user.role === "media_head") {
    where.departmentSnapshot = user.department;
  } else if (user.role === "agent") {
    // Get agent's categories
    const agentCats = await prisma.agentCategory.findMany({
      where: { userId: user.id },
      select: { categoryId: true },
    });
    const catIds = agentCats.map((ac) => ac.categoryId);

    // Agents see tickets in their categories OR assigned to them
    where.OR = [
      { categoryId: { in: catIds } },
      { assigneeId: user.id },
    ];
  }
  // admin sees all — no extra filter

  // Optional filters
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (category) where.categoryId = category;

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      category: true,
      assignee: { select: { id: true, name: true, email: true } },
      requester: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      attachments: { where: { commentId: null }, take: 1 },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tickets);
}

// POST /api/tickets — create new ticket
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const body = await req.json();

  const { description, categoryId, priority, dueDate, attachments } = body;

  if (!description || description.trim().length === 0) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  // Get user details and manager for snapshot
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { manager: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if category or priority triggers manager approval tier
  let requiresApproval = false;
  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (category && ["Procurement", "Finance", "Legal"].includes(category.name)) {
      requiresApproval = true;
    }
  }
  if (priority === "Urgent") {
    requiresApproval = true;
  }

  // Generate ticket number
  const counter = await prisma.ticketCounter.update({
    where: { id: "singleton" },
    data: { count: { increment: 1 } },
  });

  const ticketNo = `TKT-${counter.count}`;

  // Create ticket with reporting hierarchy snapshot
  const ticket = await prisma.ticket.create({
    data: {
      ticketNo,
      requesterId: dbUser.id,
      nameSnapshot: dbUser.name,
      designationSnapshot: dbUser.designation,
      departmentSnapshot: dbUser.department,
      emailSnapshot: dbUser.email,
      managerNameSnapshot: dbUser.manager?.name || (dbUser.department === "Media Cell" ? "Arjun Mehta" : null),
      managerEmailSnapshot: dbUser.manager?.email || (dbUser.department === "Media Cell" ? "mediahead@mediacell.org" : null),
      description: description.trim(),
      categoryId: categoryId || null,
      priority: priority || "Medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      requiresApproval,
      approvalStatus: requiresApproval ? "Pending" : null,
      escalationLevel: 1,
    },
  });

  // Create attachments if provided
  if (attachments && attachments.length > 0) {
    await prisma.attachment.createMany({
      data: attachments.map((a: any) => ({
        ticketId: ticket.id,
        fileUrl: a.url,
        fileName: a.name,
        mime: a.mime,
        size: a.size,
        uploadedBy: dbUser.id,
      })),
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      ticketId: ticket.id,
      action: "created",
      toStatus: "New",
      actorId: dbUser.id,
    },
  });

  // Send email notification
  sendTicketCreatedEmail({
    ticketNo: ticket.ticketNo,
    description: ticket.description,
    nameSnapshot: ticket.nameSnapshot,
    emailSnapshot: ticket.emailSnapshot,
    priority: ticket.priority,
  }).catch(console.error);

  return NextResponse.json(ticket, { status: 201 });
}
