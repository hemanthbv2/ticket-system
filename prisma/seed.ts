import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

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

  // ── Admin user ─────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@mediacell.org" },
    update: {},
    create: {
      email: "admin@mediacell.org",
      name: "System Admin",
      designation: "IT Administrator",
      department: "IT",
      role: "admin",
    },
  });

  // ── Media Head ─────────────────────────────────────────
  const mediaHead = await prisma.user.upsert({
    where: { email: "mediahead@mediacell.org" },
    update: {},
    create: {
      email: "mediahead@mediacell.org",
      name: "Arjun Mehta",
      designation: "Head of Media Cell",
      department: "Media Cell",
      role: "media_head",
    },
  });

  // ── Agents (one per category) ──────────────────────────
  const agentData = [
    { email: "agent.it@mediacell.org", name: "Ravi Kumar", designation: "IT Support Lead", department: "IT", category: "Computer/IT" },
    { email: "agent.network@mediacell.org", name: "Priya Sharma", designation: "Network Engineer", department: "IT", category: "Internet/Network" },
    { email: "agent.camera@mediacell.org", name: "Deepak Nair", designation: "Equipment Manager", department: "Media Cell", category: "Camera & Equipment" },
    { email: "agent.software@mediacell.org", name: "Sneha Patel", designation: "Software Admin", department: "IT", category: "Software/Licence" },
    { email: "agent.hr@mediacell.org", name: "Kavitha Reddy", designation: "HR Coordinator", department: "HR", category: "HR" },
    { email: "agent.admin@mediacell.org", name: "Rajesh Iyer", designation: "Facilities Manager", department: "Admin", category: "Admin/Facilities" },
    { email: "agent.finance@mediacell.org", name: "Anitha Verma", designation: "Finance Officer", department: "Finance", category: "Finance" },
    { email: "agent.legal@mediacell.org", name: "Suresh Menon", designation: "Legal Advisor", department: "Legal", category: "Legal" },
    { email: "agent.procurement@mediacell.org", name: "Meera Joshi", designation: "Procurement Officer", department: "Procurement", category: "Procurement" },
    { email: "agent.other@mediacell.org", name: "Vikram Singh", designation: "General Support", department: "Admin", category: "Other" },
  ];

  for (const a of agentData) {
    const agent = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        email: a.email,
        name: a.name,
        designation: a.designation,
        department: a.department,
        role: "agent",
      },
    });

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

  // ── 20 Media Cell Members (Requesters) ─────────────────
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
      update: {},
      create: {
        email: m.email,
        name: m.name,
        designation: m.designation,
        department: "Media Cell",
        role: "requester",
      },
    });
  }

  // ── SLA Config ─────────────────────────────────────────
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

  // ── Sample Tickets (for demo) ──────────────────────────
  const anil = await prisma.user.findUnique({ where: { email: "anil.kumar@mediacell.org" } });
  const bhavya = await prisma.user.findUnique({ where: { email: "bhavya.reddy@mediacell.org" } });
  const itAgent = await prisma.user.findUnique({ where: { email: "agent.it@mediacell.org" } });

  if (anil && bhavya && itAgent) {
    // Increment counter
    const counter = await prisma.ticketCounter.update({
      where: { id: "singleton" },
      data: { count: { increment: 3 } },
    });

    const ticket1 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-1001" },
      update: {},
      create: {
        ticketNo: "TKT-1001",
        requesterId: anil.id,
        nameSnapshot: anil.name,
        designationSnapshot: anil.designation,
        departmentSnapshot: anil.department,
        emailSnapshot: anil.email,
        categoryId: categories["Computer/IT"].id,
        description: "Edit PC not starting. Shows blue screen on boot. Need this urgently for today's deadline.",
        priority: "High",
        status: "In Progress",
        assigneeId: itAgent.id,
      },
    });

    await prisma.auditLog.create({
      data: { ticketId: ticket1.id, action: "created", toStatus: "New", actorId: anil.id },
    });
    await prisma.auditLog.create({
      data: { ticketId: ticket1.id, action: "status_change", fromStatus: "New", toStatus: "Assigned", actorId: itAgent.id },
    });
    await prisma.auditLog.create({
      data: { ticketId: ticket1.id, action: "status_change", fromStatus: "Assigned", toStatus: "In Progress", actorId: itAgent.id },
    });

    const ticket2 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-1002" },
      update: {},
      create: {
        ticketNo: "TKT-1002",
        requesterId: bhavya.id,
        nameSnapshot: bhavya.name,
        designationSnapshot: bhavya.designation,
        departmentSnapshot: bhavya.department,
        emailSnapshot: bhavya.email,
        categoryId: categories["Software/Licence"].id,
        description: "Adobe Creative Suite licence expired. Cannot open Photoshop or Premiere Pro.",
        priority: "Medium",
        status: "New",
      },
    });

    await prisma.auditLog.create({
      data: { ticketId: ticket2.id, action: "created", toStatus: "New", actorId: bhavya.id },
    });

    const ticket3 = await prisma.ticket.upsert({
      where: { ticketNo: "TKT-1003" },
      update: {},
      create: {
        ticketNo: "TKT-1003",
        requesterId: anil.id,
        nameSnapshot: anil.name,
        designationSnapshot: anil.designation,
        departmentSnapshot: anil.department,
        emailSnapshot: anil.email,
        categoryId: categories["Camera & Equipment"].id,
        description: "Camera tripod broken – the quick-release plate is cracked.",
        priority: "Low",
        status: "Resolved",
        resolvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: { ticketId: ticket3.id, action: "created", toStatus: "New", actorId: anil.id },
    });
    await prisma.auditLog.create({
      data: { ticketId: ticket3.id, action: "status_change", fromStatus: "New", toStatus: "Resolved", actorId: anil.id },
    });
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
