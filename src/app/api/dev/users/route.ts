import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dev/users — list all users for dev login switcher
export async function GET() {
  if (process.env.NODE_ENV !== "development" && process.env.GOOGLE_CLIENT_ID && process.env.ENABLE_DEV_LOGIN !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      designation: true,
      department: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}
