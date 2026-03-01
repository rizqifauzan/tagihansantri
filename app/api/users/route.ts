import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireAdmin } from "@/lib/api-auth";
import { parsePageQuery } from "@/lib/api-utils";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { q, page, pageSize } = parsePageQuery(req);
  const activeOnly = (req.nextUrl.searchParams.get("active") || "").trim() === "true";
  const includeDeleted = (req.nextUrl.searchParams.get("includeDeleted") || "").trim() === "true";

  const where = {
    ...(q ? { username: { contains: q, mode: "insensitive" } } : {}),
    ...(activeOnly ? { active: true } : {}),
    ...(includeDeleted ? {} : { isDeleted: false }),
  };

  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { username: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        role: true,
        active: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const body = await req.json();
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  const active = Boolean(body?.active ?? true);
  const role = String(body?.role || "ADMIN");

  if (!username || username.length < 3) {
    return NextResponse.json({ message: "Username minimal 3 karakter" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ message: "Password minimal 6 karakter" }, { status: 400 });
  }
  if (role !== UserRole.ADMIN) {
    return NextResponse.json({ message: "Role tidak valid" }, { status: 400 });
  }

  const exists = await db.user.findUnique({ where: { username } });
  if (exists) {
    return NextResponse.json({ message: "Username sudah dipakai" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const created = await db.user.create({
    data: { username, passwordHash, role: UserRole.ADMIN, active, isDeleted: false, deletedAt: null },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      isDeleted: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
