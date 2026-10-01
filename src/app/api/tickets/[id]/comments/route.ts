import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

// POST /api/tickets/[id]/comments — add comment to ticket
export async function POST(
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

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Access control
  if (user.role === "requester" && ticket.requesterId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Requesters cannot make internal notes
  const isInternal = user.role === "requester" ? false : (body.isInternal ?? false);

  const comment = await prisma.comment.create({
    data: {
      ticketId: id,
      authorId: user.id,
      body: body.body,
      isInternal,
    },
    include: {
      author: { select: { id: true, name: true, role: true, designation: true } },
    },
  });

  // Create attachments for the comment
  if (body.attachments && body.attachments.length > 0) {
    await prisma.attachment.createMany({
      data: body.attachments.map((a: any) => ({
        ticketId: id,
        commentId: comment.id,
        fileUrl: a.url,
        fileName: a.name,
        mime: a.mime,
        size: a.size,
        uploadedBy: user.id,
      })),
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      ticketId: id,
      action: isInternal ? "internal_note" : "comment_added",
      actorId: user.id,
    },
  });

  // Track first response time
  if ((user.role === "agent" || user.role === "admin") && !ticket.firstResponseAt) {
    await prisma.ticket.update({
      where: { id },
      data: { firstResponseAt: new Date() },
    });
  }

  // Email notification (skip for internal notes)
  if (!isInternal) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    // Email the other party
    if (user.id !== ticket.requesterId) {
      // Agent replied → email requester
      sendEmail({
        to: ticket.emailSnapshot,
        subject: `[${ticket.ticketNo}] New reply on your ticket`,
        html: `
          <h2>New Reply on ${ticket.ticketNo}</h2>
          <p><strong>${dbUser?.name}</strong> replied:</p>
          <blockquote>${body.body}</blockquote>
        `,
      }).catch(console.error);
    } else if (ticket.assigneeId) {
      // Requester replied → email agent
      const agent = await prisma.user.findUnique({ where: { id: ticket.assigneeId } });
      if (agent) {
        sendEmail({
          to: agent.email,
          subject: `[${ticket.ticketNo}] Requester replied`,
          html: `
            <h2>Reply on ${ticket.ticketNo}</h2>
            <p><strong>${dbUser?.name}</strong> replied:</p>
            <blockquote>${body.body}</blockquote>
          `,
        }).catch(console.error);
      }
    }
  }

  return NextResponse.json(comment, { status: 201 });
}
