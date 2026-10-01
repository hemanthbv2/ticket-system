import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with organizational hierarchy...");

  // ── Ticket Counter ─────────────────────────────────────
  await prisma.ticketCounter.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", count: 1000 },
  });

  // ── Categories ─────────────────────────────────────────
  const categoryNames = [
    "Computer/IT",
    "Internet/Network",
    "Camera & Equipment",
    "Software/Licence",
    "HR",
    "Admin/Facilities",
    "Finance",
    "Legal",
    "Procurement",
    "Other",
  ];

  const categories: Record<string, any> = {};
  for (const name of categoryNames) {
    categories[name] = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name, description: `${name} support` },
    });
  }

  // ── 1. Top Level: Admin User ───────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@mediacell.org" },
    update: {
      designation: "IT Administrator & Director",
      department: "IT & Operations",
      role: "admin",
    },
    create: {
      email: "admin@mediacell.org",
      name: "System Admin",
      designation: "IT Administrator & Director",
      department: "IT & Operations",
      role: "admin",
    },
  });

  // ── 2. Senior Management: Media Head ───────────────────
  // Reports directly to Admin/Executive
  const mediaHead = await prisma.user.upsert({
    where: { email: "mediahead@mediacell.org" },
    update: {
      managerId: admin.id,
      designation: "Head of Media Cell",
      department: "Media Cell",
      role: "media_head",
    },
    create: {
      email: "mediahead@mediacell.org",
      name: "Arjun Mehta",
      designation: "Head of Media Cell",
      department: "Media Cell",
      role: "media_head",
      managerId: admin.id,
    },
  });

  // ── 3. Support Leads & Agents (Tier 1 & Tier 2) ─────────
  // IT Support Lead reports to Admin
  const itLead = await prisma.user.upsert({
    where: { email: "agent.it@mediacell.org" },
    update: {
      managerId: admin.id,
      designation: "IT Support Lead",
      department: "IT",
      role: "agent",
    },
    create: {
      email: "agent.it@mediacell.org",
      name: "Ravi Kumar",
      designation: "IT Support Lead",
      department: "IT",
      role: "agent",
      managerId: admin.id,
    },
  });

  const agentData = [
    { email: "agent.network@mediacell.org", name: "Priya Sharma", designation: "Network Engineer", department: "IT", category: "Internet/Network", managerId: itLead.id },
    { email: "agent.camera@mediacell.org", name: "Deepak Nair", designation: "Equipment Manager", department: "Media Cell", category: "Camera & Equipment", managerId: mediaHead.id },
    { email: "agent.software@mediacell.org", name: "Sneha Patel", designation: "Software Admin", department: "IT", category: "Software/Licence", managerId: itLead.id },
    { email: "agent.hr@mediacell.org", name: "Kavitha Reddy", designation: "HR Coordinator", department: "HR", category: "HR", managerId: admin.id },
    { email: "agent.admin@mediacell.org", name: "Rajesh Iyer", designation: "Facilities Manager", department: "Admin", category: "Admin/Facilities", managerId: admin.id },
    { email: "agent.finance@mediacell.org", name: "Anitha Verma", designation: "Finance Officer", department: "Finance", category: "Finance", managerId: admin.id },
    { email: "agent.legal@mediacell.org", name: "Suresh Menon", designation: "Legal Advisor", department: "Legal", category: "Legal", managerId: admin.id },
    { email: "agent.procurement@mediacell.org", name: "Meera Joshi", designation: "Procurement Officer", department: "Procurement", category: "Procurement", managerId: admin.id },
    { email: "agent.other@mediacell.org", name: "Vikram Singh", designation: "General Support", department: "Admin", category: "Other", managerId: admin.id },
  ];

  const agentUsers: Record<string, any> = { "Computer/IT": itLead };

  // Map category for IT Lead
  await prisma.agentCategory.upsert({
    where: {
      userId_categoryId: {
        userId: itLead.id,
        categoryId: categories["Computer/IT"].id,
      },
    },
    update: {},
    create: {
      userId: itLead.id,
      categoryId: categories["Computer/IT"].id,
    },
  });

  for (const a of agentData) {
    const agent = await prisma.user.upsert({
      where: { email: a.email },
      update: {
        managerId: a.managerId,
        designation: a.designation,
        department: a.department,
      },
      create: {
        email: a.email,
        name: a.name,
        designation: a.designation,
        department: a.department,
        role: "agent",
        managerId: a.managerId,
      },
    });

    agentUsers[a.category] = agent;

    await prisma.agentCategory.upsert({
      where: {
        userId_categoryId: {
          userId: agent.id,
          categoryId: categories[a.category].id,
        },
      },
      update: {},
      create: {
        userId: agent.id,
        categoryId: categories[a.category].id,
      },
    });
  }

  // ── 4. 20 Media Cell Members (Direct Reports to Media Head) ─
  const members = [
    { email: "anil.kumar@mediacell.org", name: "Anil Kumar", designation: "Video Editor" },
    { email: "bhavya.reddy@mediacell.org", name: "Bhavya Reddy", designation: "Graphic Designer" },
    { email: "chandra.mohan@mediacell.org", name: "Chandra Mohan", designation: "Cameraman" },
    { email: "divya.nair@mediacell.org", name: "Divya Nair", designation: "Content Writer" },
    { email: "esha.gupta@mediacell.org", name: "Esha Gupta", designation: "Social Media Manager" },
    { email: "farhan.ali@mediacell.org", name: "Farhan Ali", designation: "Video Editor" },
    { email: "gita.sharma@mediacell.org", name: "Gita Sharma", designation: "Photographer" },
    { email: "hari.prasad@mediacell.org", name: "Hari Prasad", designation: "Motion Graphics Artist" },
    { email: "isha.verma@mediacell.org", name: "Isha Verma", designation: "Audio Engineer" },
    { email: "jay.patel@mediacell.org", name: "Jay Patel", designation: "VFX Artist" },
    { email: "kiran.rao@mediacell.org", name: "Kiran Rao", designation: "Production Assistant" },
    { email: "lakshmi.iyer@mediacell.org", name: "Lakshmi Iyer", designation: "Scriptwriter" },
    { email: "mohan.das@mediacell.org", name: "Mohan Das", designation: "Cameraman" },
    { email: "neha.singh@mediacell.org", name: "Neha Singh", designation: "Graphic Designer" },
    { email: "om.prakash@mediacell.org", name: "Om Prakash", designation: "IT Coordinator" },
    { email: "padma.joshi@mediacell.org", name: "Padma Joshi", designation: "Content Manager" },
    { email: "qasim.khan@mediacell.org", name: "Qasim Khan", designation: "Video Editor" },
    { email: "rekha.menon@mediacell.org", name: "Rekha Menon", designation: "Photographer" },
    { email: "sunil.verma@mediacell.org", name: "Sunil Verma", designation: "Production Coordinator" },
    { email: "tara.devi@mediacell.org", name: "Tara Devi", designation: "Animator" },
  ];

  for (const m of members) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: {
        managerId: mediaHead.id,
        designation: m.designation,
        department: "Media Cell",
      },
      create: {
        email: m.email,
        name: m.name,
        designation: m.designation,
        department: "Media Cell",
        role: "requester",
        managerId: mediaHead.id,
      },
    });
  }

  // ── 5. SLA Config ──────────────────────────────────────
  const slaDefaults = [
    { priority: "Urgent", firstResponseMinutes: 60, resolutionMinutes: 240 },
    { priority: "High", firstResponseMinutes: 240, resolutionMinutes: 1440 },
    { priority: "Medium", firstResponseMinutes: 1440, resolutionMinutes: 4320 },
    { priority: "Low", firstResponseMinutes: 2880, resolutionMinutes: 7200 },
  ];

  for (const sla of slaDefaults) {
    await prisma.slaConfig.upsert({
      where: { priority: sla.priority },
      update: {},
      create: sla,
    });
  }

  // ── 6. Hierarchy-Aware Sample Tickets ──────────────────
  const anil = await prisma.user.findUnique({ where: { email: "anil.kumar@mediacell.org" } });
  const bhavya = await prisma.user.findUnique({ where: { email: "bhavya.reddy@mediacell.org" } });
  const divya = await prisma.user.findUnique({ where: { email: "divya.nair@mediacell.org" } });
  const farhan = await prisma.user.findUnique({ where: { email: "farhan.ali@mediacell.org" } });
  const procurementAgent = agentUsers["Procurement"];

  if (anil && bhavya && divya && farhan) {
    await prisma.ticketCounter.update({
      where: { id: "singleton" },
      data: { count: { increment: 5 } },
    });

    // Ticket 1: Standard IT Ticket (Reporting manager snapshot attached)
    const ticket1 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-1001" },
      update: {
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
      },
      create: {
        ticketNo: "TKT-1001",
        requesterId: anil.id,
        nameSnapshot: anil.name,
        designationSnapshot: anil.designation,
        departmentSnapshot: anil.department,
        emailSnapshot: anil.email,
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
        categoryId: categories["Computer/IT"].id,
        description: "Edit PC not starting. Shows blue screen on boot. Need this urgently for today's deadline.",
        priority: "High",
        status: "In Progress",
        assigneeId: itLead.id,
      },
    });

    await prisma.auditLog.create({
      data: { ticketId: ticket1.id, action: "created", toStatus: "New", actorId: anil.id },
    });
    await prisma.auditLog.create({
      data: { ticketId: ticket1.id, action: "assigned", actorId: itLead.id, details: JSON.stringify({ assignee: itLead.name }) },
    });

    // Ticket 2: High-Impact Software Licence (Requires Manager Approval - Pending)
    const ticket2 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-1002" },
      update: {
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
        requiresApproval: true,
        approvalStatus: "Pending",
      },
      create: {
        ticketNo: "TKT-1002",
        requesterId: bhavya.id,
        nameSnapshot: bhavya.name,
        designationSnapshot: bhavya.designation,
        departmentSnapshot: bhavya.department,
        emailSnapshot: bhavya.email,
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
        categoryId: categories["Software/Licence"].id,
        description: "Adobe Creative Cloud enterprise license expired. Need renewal and budget approval for graphic suite.",
        priority: "High",
        status: "New",
        requiresApproval: true,
        approvalStatus: "Pending",
      },
    });

    await prisma.auditLog.create({
      data: { ticketId: ticket2.id, action: "created", toStatus: "New", actorId: bhavya.id },
    });

    // Ticket 3: Procurement Request (Approved by Media Head)
    const ticket3 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-1003" },
      update: {
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
        requiresApproval: true,
        approvalStatus: "Approved",
        approvedById: mediaHead.id,
        approvedAt: new Date(),
        approvalNotes: "Approved under Media Cell FY26 Q3 capital expenditure budget.",
      },
      create: {
        ticketNo: "TKT-1003",
        requesterId: divya.id,
        nameSnapshot: divya.name,
        designationSnapshot: divya.designation,
        departmentSnapshot: divya.department,
        emailSnapshot: divya.email,
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
        categoryId: categories["Procurement"].id,
        description: "Requisition for 2x Sony FX3 cinema lenses and wireless audio kit for national documentary shoot.",
        priority: "Urgent",
        status: "Assigned",
        assigneeId: procurementAgent?.id || null,
        requiresApproval: true,
        approvalStatus: "Approved",
        approvedById: mediaHead.id,
        approvedAt: new Date(),
        approvalNotes: "Approved under Media Cell FY26 Q3 capital expenditure budget.",
      },
    });

    await prisma.auditLog.create({
      data: { ticketId: ticket3.id, action: "created", toStatus: "New", actorId: divya.id },
    });
    await prisma.auditLog.create({
      data: { ticketId: ticket3.id, action: "ticket_approved", actorId: mediaHead.id, details: JSON.stringify({ approver: mediaHead.name, notes: "Approved under Media Cell FY26 Q3 budget" }) },
    });

    // Ticket 4: Escalated Ticket (Tier 2 Escalation)
    const ticket4 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-1004" },
      update: {
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
        isEscalated: true,
        escalationLevel: 2,
        escalationReason: "Tier 1 hardware troubleshooting failed. Escalated to Infrastructure Team to prevent transmission outage.",
        escalatedAt: new Date(),
      },
      create: {
        ticketNo: "TKT-1004",
        requesterId: farhan.id,
        nameSnapshot: farhan.name,
        designationSnapshot: farhan.designation,
        departmentSnapshot: farhan.department,
        emailSnapshot: farhan.email,
        managerNameSnapshot: mediaHead.name,
        managerEmailSnapshot: mediaHead.email,
        categoryId: categories["Computer/IT"].id,
        description: "Studio Render Node 4 GPU failure during prime-time live stream. Broadcast is stalled.",
        priority: "Urgent",
        status: "In Progress",
        assigneeId: itLead.id,
        isEscalated: true,
        escalationLevel: 2,
        escalationReason: "Tier 1 hardware troubleshooting failed. Escalated to Infrastructure Team to prevent transmission outage.",
        escalatedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { ticketId: ticket4.id, action: "created", toStatus: "New", actorId: farhan.id },
    });
    await prisma.auditLog.create({
      data: { ticketId: ticket4.id, action: "ticket_escalated", actorId: mediaHead.id, details: JSON.stringify({ reason: "Tier 1 hardware failure. Prime-time live stream at risk.", level: 2 }) },
    });
  }

  console.log("✅ Seed complete! Organizational hierarchy established.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
