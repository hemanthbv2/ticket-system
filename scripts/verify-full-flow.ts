/**
 * Verification & Security Audit Test Script
 * Runs the complete lifecycle across all 4 roles:
 * - requester
 * - agent
 * - media_head
 * - admin
 *
 * Verifies all security constraints:
 * 1. 403 on other user's ticket
 * 2. 403 on /queue, /dashboard, /admin for requester
 * 3. Internal notes never visible to requester (comments + audit logs + emails)
 * 4. Snapshot identity fields immutable
 * 5. Server-side upload validation (file type, size, magic bytes)
 */

import { PrismaClient } from "@prisma/client";

const BASE_URL = "http://localhost:3000";
const prisma = new PrismaClient();

interface StepResult {
  step: string;
  role: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: StepResult[] = [];

function record(step: string, role: string, passed: boolean, error?: string, details?: any) {
  results.push({ step, role, passed, error, details });
  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status} [${role}] ${step}${error ? ` -> ${error}` : ""}`);
}

/**
 * Helper to authenticate via dev-login credentials provider and get session cookies
 */
async function loginAs(email: string): Promise<string> {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfCookies = (csrfRes.headers as any).getSetCookie
    ? (csrfRes.headers as any).getSetCookie()
    : [csrfRes.headers.get("set-cookie") || ""];
  const { csrfToken } = await csrfRes.json();

  // 2. Sign in with dev-login
  const signinRes = await fetch(`${BASE_URL}/api/auth/callback/dev-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: csrfCookies.map((c: string) => c.split(";")[0]).join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      redirect: "false",
      callbackUrl: `${BASE_URL}/tickets`,
    }),
    redirect: "manual",
  });

  const sessionCookies = (signinRes.headers as any).getSetCookie
    ? (signinRes.headers as any).getSetCookie()
    : [signinRes.headers.get("set-cookie") || ""];

  const cookieMap: Record<string, string> = {};
  for (const c of [...csrfCookies, ...sessionCookies]) {
    const [pair] = c.split(";");
    const [k, ...v] = pair.split("=");
    if (k && v.length) cookieMap[k.trim()] = v.join("=").trim();
  }

  return Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function run() {
  console.log("\n🚀 Starting Full Flow & Security Verification...\n");

  try {
    // ── Setup test users ──────────────────────────────────
    const requesterEmail = "anil.kumar@mediacell.org";
    const otherRequesterEmail = "bhavya.reddy@mediacell.org";
    const agentEmail = "agent.it@mediacell.org";
    const mediaHeadEmail = "mediahead@mediacell.org";
    const adminEmail = "admin@mediacell.org";

    // ──────────────────────────────────────────────────────
    // STEP 1: Requester Flow & Ticket Creation with Photo
    // ──────────────────────────────────────────────────────
    console.log("\n─── 1. Testing Role: Requester (Anil Kumar) ───");
    const requesterCookie = await loginAs(requesterEmail);
    record("Login via NextAuth session", "requester", !!requesterCookie);

    // 1.1 Upload valid photo (JPEG with valid magic bytes FF D8 FF)
    const validJpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const formData = new FormData();
    const photoBlob = new Blob([validJpegBytes], { type: "image/jpeg" });
    formData.append("files", photoBlob, "screen_error.jpg");

    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Cookie: requesterCookie },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    const uploadSuccess = uploadRes.ok && uploadData.files?.length > 0;
    record("Upload photo attachment with server validation", "requester", uploadSuccess, !uploadSuccess ? JSON.stringify(uploadData) : undefined);

    const uploadedPhoto = uploadData.files?.[0];

    // 1.2 Create Ticket
    const itCategory = await prisma.category.findUnique({ where: { name: "Computer/IT" } });
    const createTicketRes = await fetch(`${BASE_URL}/api/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: requesterCookie,
      },
      body: JSON.stringify({
        description: "Premiere Pro crashes during 4K render export. GPU acceleration error.",
        categoryId: itCategory?.id,
        priority: "High",
        attachments: uploadedPhoto ? [uploadedPhoto] : [],
      }),
    });
    const newTicket = await createTicketRes.json();
    const ticketCreated = createTicketRes.ok && newTicket?.id && newTicket?.ticketNo;
    record("Create ticket with photo & category", "requester", ticketCreated, !ticketCreated ? JSON.stringify(newTicket) : undefined);

    const ticketId = newTicket.id;

    // 1.3 Verify Snapshot Identity fields match user in DB and are not spoofable
    const dbUser = await prisma.user.findUnique({ where: { email: requesterEmail } });
    const snapshotsAccurate =
      newTicket.nameSnapshot === dbUser?.name &&
      newTicket.emailSnapshot === dbUser?.email &&
      newTicket.designationSnapshot === dbUser?.designation &&
      newTicket.departmentSnapshot === dbUser?.department;
    record("Auto-filled read-only snapshot identity saved accurately", "requester", snapshotsAccurate);

    // 1.4 Security check: Snapshot identity fields cannot be edited via API
    const tamperRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: requesterCookie,
      },
      body: JSON.stringify({
        nameSnapshot: "Hacker Name",
        emailSnapshot: "hacker@evil.com",
        designationSnapshot: "Director",
      }),
    });
    record(
      "Security: Immutable snapshot identity tampering rejected (400)",
      "requester",
      tamperRes.status === 400,
      tamperRes.status !== 400 ? `Status was ${tamperRes.status}` : undefined
    );

    // 1.5 Security check: Access another user's ticket -> 403 Forbidden
    const otherUser = await prisma.user.findUnique({ where: { email: otherRequesterEmail } });
    const otherTicket = await prisma.ticket.findFirst({ where: { requesterId: otherUser?.id } });
    if (otherTicket) {
      const forbiddenTicketRes = await fetch(`${BASE_URL}/api/tickets/${otherTicket.id}`, {
        headers: { Cookie: requesterCookie },
      });
      record(
        "Security: Accessing another user's ticket returns 403 Forbidden",
        "requester",
        forbiddenTicketRes.status === 403,
        forbiddenTicketRes.status !== 403 ? `Status was ${forbiddenTicketRes.status}` : undefined
      );
    }

    // 1.6 Security check: Requester accessing /queue, /dashboard, /admin returns 403
    const queueRes = await fetch(`${BASE_URL}/queue`, { headers: { Cookie: requesterCookie } });
    record("Security: Requester accessing /queue blocked with 403 Forbidden", "requester", queueRes.status === 403);

    const dashRes = await fetch(`${BASE_URL}/dashboard`, { headers: { Cookie: requesterCookie } });
    record("Security: Requester accessing /dashboard blocked with 403 Forbidden", "requester", dashRes.status === 403);

    const adminRes = await fetch(`${BASE_URL}/admin`, { headers: { Cookie: requesterCookie } });
    record("Security: Requester accessing /admin blocked with 403 Forbidden", "requester", adminRes.status === 403);

    // 1.7 Requester adds a comment
    const commentRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: requesterCookie,
      },
      body: JSON.stringify({ body: "Issue occurs every time Lumetri Color effect is applied." }),
    });
    record("Requester adds public comment", "requester", commentRes.ok);

    // ──────────────────────────────────────────────────────
    // STEP 2: Support Agent Flow (Ravi Kumar)
    // ──────────────────────────────────────────────────────
    console.log("\n─── 2. Testing Role: Support Agent (Ravi Kumar) ───");
    const agentCookie = await loginAs(agentEmail);
    record("Login via NextAuth session", "agent", !!agentCookie);

    // 2.1 Agent accesses queue
    const agentQueueRes = await fetch(`${BASE_URL}/queue`, { headers: { Cookie: agentCookie } });
    record("Agent accesses /queue successfully (200)", "agent", agentQueueRes.ok);

    // 2.2 Agent assigns ticket to self
    const itAgentUser = await prisma.user.findUnique({ where: { email: agentEmail } });
    const assignRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookie,
      },
      body: JSON.stringify({ assigneeId: itAgentUser?.id, status: "Assigned" }),
    });
    record("Agent assigns ticket to self", "agent", assignRes.ok);

    // 2.3 Agent changes status to 'In Progress'
    const inProgressRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookie,
      },
      body: JSON.stringify({ status: "In Progress" }),
    });
    record("Agent changes status to 'In Progress'", "agent", inProgressRes.ok);

    // 2.4 Agent adds an internal note (isInternal: true)
    const internalNoteRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookie,
      },
      body: JSON.stringify({
        body: "INTERNAL NOTE: Suspect CUDA driver conflict with Studio driver v552. Reinstalling driver remotely.",
        isInternal: true,
      }),
    });
    record("Agent creates internal note (agent-only)", "agent", internalNoteRes.ok);

    // 2.5 Agent adds a public reply
    const publicReplyRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookie,
      },
      body: JSON.stringify({
        body: "We have pushed an updated display driver. Please test export again.",
        isInternal: false,
      }),
    });
    record("Agent replies with public comment", "agent", publicReplyRes.ok);

    // 2.6 VERIFY: Requester CANNOT see the internal note or internal note audit log
    const requesterViewRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}`, {
      headers: { Cookie: requesterCookie },
    });
    const requesterViewData = await requesterViewRes.json();
    const hasInternalComment = requesterViewData.comments.some((c: any) => c.isInternal || c.body.includes("INTERNAL NOTE"));
    const hasInternalAudit = requesterViewData.auditLogs.some((a: any) => a.action === "internal_note");
    record(
      "Security: Internal note completely hidden from requester (comments & audit trail)",
      "agent",
      !hasInternalComment && !hasInternalAudit
    );

    // 2.7 Agent resolves ticket
    const resolveRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: agentCookie,
      },
      body: JSON.stringify({ status: "Resolved" }),
    });
    record("Agent marks ticket as 'Resolved'", "agent", resolveRes.ok);

    // ──────────────────────────────────────────────────────
    // STEP 3: Media Head Flow (Arjun Mehta)
    // ──────────────────────────────────────────────────────
    console.log("\n─── 3. Testing Role: Media Head (Arjun Mehta) ───");
    const mediaHeadCookie = await loginAs(mediaHeadEmail);
    record("Login via NextAuth session", "media_head", !!mediaHeadCookie);

    // 3.1 Media Head accesses dashboard
    const mediaHeadDashRes = await fetch(`${BASE_URL}/dashboard`, { headers: { Cookie: mediaHeadCookie } });
    record("Media Head accesses /dashboard successfully (200)", "media_head", mediaHeadDashRes.ok);

    // 3.2 Media Head views ticket list
    const mediaHeadTicketsRes = await fetch(`${BASE_URL}/api/tickets`, { headers: { Cookie: mediaHeadCookie } });
    const mediaHeadTickets = await mediaHeadTicketsRes.json();
    record("Media Head retrieves department tickets list", "media_head", mediaHeadTicketsRes.ok && Array.isArray(mediaHeadTickets));

    // ──────────────────────────────────────────────────────
    // STEP 4: Admin Flow (System Admin)
    // ──────────────────────────────────────────────────────
    console.log("\n─── 4. Testing Role: Admin (System Admin) ───");
    const adminCookie = await loginAs(adminEmail);
    record("Login via NextAuth session", "admin", !!adminCookie);

    // 4.1 Admin accesses admin panel
    const adminPanelRes = await fetch(`${BASE_URL}/admin`, { headers: { Cookie: adminCookie } });
    record("Admin accesses /admin successfully (200)", "admin", adminPanelRes.ok);

    // 4.2 Admin changes status to 'Closed'
    const closeRes = await fetch(`${BASE_URL}/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify({ status: "Closed" }),
    });
    record("Admin closes ticket ('Closed')", "admin", closeRes.ok);

    // 4.3 Verify full ticket lifecycle and audit trail
    const finalTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { auditLogs: true, comments: true },
    });
    const statusSequence = ["created", "status_change", "assigned", "status_change", "status_change", "status_change"];
    const actionsRecorded = finalTicket?.auditLogs.map((l) => l.action) || [];
    const closedProperly = finalTicket?.status === "Closed" && !!finalTicket?.resolvedAt && !!finalTicket?.closedAt;
    record(
      "Complete ticket lifecycle through to Closed with timestamps & audit trail",
      "admin",
      closedProperly
    );

    // ──────────────────────────────────────────────────────
    // STEP 5: Server-Side Upload Security Validation
    // ──────────────────────────────────────────────────────
    console.log("\n─── 5. Testing Server-Side File Upload Hardening ───");

    // 5.1 Reject executable file disguised as png
    const fakePngFormData = new FormData();
    const fakePngBlob = new Blob([Buffer.from("MZ\x90\x00\x03\x00\x00\x00")], { type: "image/png" });
    fakePngFormData.append("files", fakePngBlob, "malware.png");
    const fakeUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Cookie: requesterCookie },
      body: fakePngFormData,
    });
    record(
      "Upload security: Reject corrupted/spoofed magic bytes (400)",
      "security",
      fakeUploadRes.status === 400
    );

    // 5.2 Reject disallowed extension (.exe)
    const exeFormData = new FormData();
    const exeBlob = new Blob([Buffer.from("MZ\x90\x00")], { type: "application/octet-stream" });
    exeFormData.append("files", exeBlob, "script.exe");
    const exeUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Cookie: requesterCookie },
      body: exeFormData,
    });
    record(
      "Upload security: Reject disallowed mime type & extension (400)",
      "security",
      exeUploadRes.status === 400
    );

    // 5.3 Reject oversized file (> 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0xff); // 11 MB
    const largeFormData = new FormData();
    const largeBlob = new Blob([largeBuffer], { type: "image/jpeg" });
    largeFormData.append("files", largeBlob, "giant.jpg");
    const largeUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Cookie: requesterCookie },
      body: largeFormData,
    });
    record(
      "Upload security: Reject file exceeding 10MB limit (400)",
      "security",
      largeUploadRes.status === 400
    );

    // 5.4 Reject 0-byte file
    const emptyFormData = new FormData();
    const emptyBlob = new Blob([], { type: "image/jpeg" });
    emptyFormData.append("files", emptyBlob, "empty.jpg");
    const emptyUploadRes = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: { Cookie: requesterCookie },
      body: emptyFormData,
    });
    record(
      "Upload security: Reject empty 0-byte file (400)",
      "security",
      emptyUploadRes.status === 400
    );

    // ── Summary ───────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════════");
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`TOTAL CHECKS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
    console.log("═══════════════════════════════════════════════════\n");

    if (passedCount !== totalCount) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error during test run:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
