/**
 * Email service — Nodemailer with SMTP, or console logger as fallback.
 */
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || "tickets@example.com";

  if (!transporter) {
    // Log to console when SMTP is not configured
    console.log("═══════════════════════════════════════════");
    console.log("📧 EMAIL (console mode — SMTP not configured)");
    console.log(`   From: ${from}`);
    console.log(`   To: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body: ${options.text || "(HTML only)"}`);
    console.log("═══════════════════════════════════════════");
    return;
  }

  await transporter.sendMail({
    from,
    to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

// ── Email Templates ──────────────────────────────────────

export async function sendTicketCreatedEmail(ticket: {
  ticketNo: string;
  description: string;
  nameSnapshot: string;
  emailSnapshot: string;
  priority: string;
}) {
  await sendEmail({
    to: ticket.emailSnapshot,
    subject: `[${ticket.ticketNo}] Ticket Created — ${ticket.description.slice(0, 50)}`,
    html: `
      <h2>Ticket ${ticket.ticketNo} Created</h2>
      <p>Hi ${ticket.nameSnapshot},</p>
      <p>Your ticket has been created successfully.</p>
      <p><strong>Description:</strong> ${ticket.description}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p>You will be notified when there is an update.</p>
    `,
    text: `Ticket ${ticket.ticketNo} created: ${ticket.description}`,
  });
}

export async function sendTicketAssignedEmail(
  agentEmail: string,
  agentName: string,
  ticket: { ticketNo: string; description: string }
) {
  await sendEmail({
    to: agentEmail,
    subject: `[${ticket.ticketNo}] Assigned to you — ${ticket.description.slice(0, 50)}`,
    html: `
      <h2>Ticket ${ticket.ticketNo} Assigned</h2>
      <p>Hi ${agentName},</p>
      <p>A ticket has been assigned to you.</p>
      <p><strong>Description:</strong> ${ticket.description}</p>
    `,
    text: `Ticket ${ticket.ticketNo} assigned to you: ${ticket.description}`,
  });
}

export async function sendStatusChangeEmail(
  requesterEmail: string,
  requesterName: string,
  ticket: { ticketNo: string; description: string },
  newStatus: string
) {
  await sendEmail({
    to: requesterEmail,
    subject: `[${ticket.ticketNo}] Status → ${newStatus}`,
    html: `
      <h2>Ticket ${ticket.ticketNo} Updated</h2>
      <p>Hi ${requesterName},</p>
      <p>Your ticket status has been updated to <strong>${newStatus}</strong>.</p>
      <p><strong>Description:</strong> ${ticket.description}</p>
    `,
    text: `Ticket ${ticket.ticketNo} status changed to ${newStatus}`,
  });
}
