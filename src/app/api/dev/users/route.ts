import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dev/users — list all users for dev login switcher
export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      designation: true,
      department: true,
      manager: {
        select: {
          id: true,
          name: true,
          designation: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}
