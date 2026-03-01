import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { id } = await params;
  const body = await req.json();
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  const active = Boolean(body?.active ?? true);
  const role = String(body?.role || "ADMIN");

  if (!username || username.length < 3) {
    return NextResponse.json({ message: "Username minimal 3 karakter" }, { status: 400 });
  }
  if (role !== UserRole.ADMIN) {
    return NextResponse.json({ message: "Role tidak valid" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
  }
  if (existing.isDeleted) {
    return NextResponse.json({ message: "User sudah dihapus" }, { status: 400 });
  }

  const duplicate = await db.user.findFirst({
    where: {
      username,
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ message: "Username sudah dipakai" }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    username,
    role: UserRole.ADMIN,
    active,
  };
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ message: "Password minimal 6 karakter" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(password);
  }

  const updated = await db.user.update({
    where: { id },
    data,
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

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;
  const db = prisma as any;

  const { id } = await params;
  const existing = await db.user.findUnique({
    where: { id },
    select: { id: true, username: true, isDeleted: true },
  });
  if (!existing) {
    return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });
  }
  if (existing.isDeleted) {
    return NextResponse.json({ ok: true });
  }

  // Preserve unique username by renaming deleted records.
  const stamp = Date.now();
  const nextUsername = `${existing.username}__deleted_${stamp}`;
  await db.user.update({
    where: { id },
    data: {
      username: nextUsername,
      active: false,
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
