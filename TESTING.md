# TicketFlow — Verification, Testing & Security Guide

This document explains how to run the verification suite and manually test each role and security constraint.

---

## 🚀 Quick Automated Verification (All Roles + Security)

Run the full end-to-end automated verification script:

```bash
npm run test:verify
```

This runs a 29-step automated test suite covering:
1. **Requester flow** (`anil.kumar@mediacell.org`): session login, photo upload, ticket creation, identity snapshot verification, and comment posting.
2. **Support Agent flow** (`agent.it@mediacell.org`): queue triage, self-assignment, status to `In Progress`, internal note creation, public comment, and status to `Resolved`.
3. **Media Head flow** (`mediahead@mediacell.org`): dashboard access, metrics retrieval, department tickets view.
4. **Admin flow** (`admin@mediacell.org`): admin panel access, ticket status to `Closed`, audit trail verification.
5. **Security checks**:
   - Requester gets **403 Forbidden** accessing another user's ticket (`/api/tickets/[id]`).
   - Requester gets **403 Forbidden** accessing `/queue`, `/dashboard`, and `/admin`.
   - Internal notes are **completely stripped** from requester view (both comment thread and audit logs) and never sent in emails.
   - Snapshot identity fields (`nameSnapshot`, `emailSnapshot`, etc.) **cannot be modified** via API (returns 400 Bad Request).
   - Server-side upload validation:
     - Disallowed file types/extensions rejected (400)
     - Spoofed magic bytes rejected (400)
     - Oversized files (>10MB) rejected (400)
     - Empty 0-byte files rejected (400)

---

## 👥 Manual Role Testing in the Browser

Navigate to **[http://localhost:3000/login](http://localhost:3000/login)** to use the **Quick Switcher (Dev Mode)**:

### 1. Test as Requester (`Anil Kumar` — Video Editor)
1. Click **"Requester"** chip and select **Anil Kumar**.
2. Click **"+ Raise Ticket"**:
   - Notice your name, designation, department, and email are auto-filled and read-only.
   - Upload or drag-and-drop a photo (or paste with `Ctrl+V`).
   - Fill in description (e.g., *"Edit PC freezing on timeline"*), select Category (`Computer/IT`), Priority (`High`).
   - Click **Submit Ticket**.
3. In **My Tickets**, click on the newly created ticket:
   - Notice the status is `New`.
   - Add a comment.
4. **Security Check (403 URLs)**:
   - Try navigating to `http://localhost:3000/queue` in the address bar → verify **403 Forbidden** page.
   - Try navigating to `http://localhost:3000/dashboard` in the address bar → verify **403 Forbidden** page.
   - Try navigating to `http://localhost:3000/admin` in the address bar → verify **403 Forbidden** page.
5. **Security Check (Other User's Ticket)**:
   - Copy the URL of another user's ticket (e.g. `http://localhost:3000/tickets/cmup2k4ar001vcuj8z9bmcfb6` created by Bhavya Reddy) and paste it while logged in as Anil → verify **403 Forbidden** screen.

---

### 2. Test as Support Agent (`Ravi Kumar` — IT Support Lead)
1. Go to `/login` and select **Ravi Kumar** under **Agent**.
2. Go to **Queue** (`/queue`):
   - Notice the ticket raised by Anil Kumar appears at the top.
   - Filter by Priority (`High`), Status (`New`), or Assignment (`Unassigned`).
   - Click **"Assign to me"** → ticket moves to `Assigned`.
3. Open the ticket detail:
   - Click **"Start Work"** → status transitions to `In Progress`.
   - In the reply box, check **"Internal note (not visible to requester)"**.
   - Type *"Checking GPU thermal paste and drivers."* and click **Send**.
   - Notice the note is styled in Amber with an **Internal** lock badge.
   - Add a public reply: *"We are investigating your crash logs."*
   - Click **"Resolve"** → status transitions to `Resolved`.
4. Switch back to **Anil Kumar** in `/login` and open the ticket:
   - Verify the public reply is visible.
   - Verify the **internal note does not exist** anywhere in comments or the Activity timeline.

---

### 3. Test as Media Head (`Arjun Mehta` — Head of Media Cell)
1. Go to `/login` and select **Arjun Mehta** under **Media Head**.
2. Go to **Dashboard** (`/dashboard`):
   - Review KPI summary cards (Total Tickets, Open, Resolved, Avg Resolution Time).
   - Review urgent/overdue alert banners.
   - Review distribution charts (By Status, By Priority, By Category, Tickets per Member).
   - Click **Export CSV** → downloads `.csv` file with department tickets.

---

### 4. Test as Admin (`System Admin`)
1. Go to `/login` and select **System Admin** under **Admin**.
2. Go to **Admin Panel** (`/admin`):
   - View all 20 Media Cell team members, agents, and administrators.
   - Switch to the **Categories** tab to see active routing categories.
3. Open any Resolved ticket and click **"Close"** → status transitions to `Closed`.
4. Inspect the **Activity Log** to verify the full immutable audit trail from creation to closure.

---

## 🔒 Security Hardening Summary

| Protection | Server-Side Enforcement Point | Status |
|---|---|---|
| **Restricted Web Routes** | [`src/middleware.ts`](file:///d:/hemanth%20bv/Ticket%20system/ticket-system/src/middleware.ts) blocks requesters from `/queue`, `/dashboard`, `/admin` returning HTTP 403 status. | ✅ Active |
| **Ticket Ownership** | [`src/app/api/tickets/[id]/route.ts`](file:///d:/hemanth%20bv/Ticket%20system/ticket-system/src/app/api/tickets/%5Bid%5D/route.ts) returns 403 on GET/PATCH/POST for other users' tickets. | ✅ Active |
| **Snapshot Immutability** | [`src/app/api/tickets/[id]/route.ts`](file:///d:/hemanth%20bv/Ticket%20system/ticket-system/src/app/api/tickets/%5Bid%5D/route.ts) rejects any attempt to update snapshot fields with 400 Bad Request. | ✅ Active |
| **Internal Notes Protection** | Filtered from API responses and audit logs for requesters; excluded from requester email alerts in [`src/app/api/tickets/[id]/comments/route.ts`](file:///d:/hemanth%20bv/Ticket%20system/ticket-system/src/app/api/tickets/%5Bid%5D/comments/route.ts). | ✅ Active |
| **Upload Validation** | [`src/app/api/upload/route.ts`](file:///d:/hemanth%20bv/Ticket%20system/ticket-system/src/app/api/upload/route.ts) validates MIME types, allowed extensions, 10MB size ceiling, and file magic bytes. | ✅ Active |
| **Path Traversal Protection** | [`src/app/api/uploads/[filename]/route.ts`](file:///d:/hemanth%20bv/Ticket%20system/ticket-system/src/app/api/uploads/%5Bfilename%5D/route.ts) sanitizes filenames with `path.basename` and validates absolute boundaries. | ✅ Active |

---

## 🗄️ Database Commands

```bash
# Push schema changes to database
npm run db:push

# Re-seed all users, categories, SLA rules, and sample tickets
npm run db:seed

# Reset and seed in one step
npm run db:setup
```
