import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  const accept = req.headers.get("accept") || "";
  const wantsJson = contentType.includes("application/json") || accept.includes("application/json");

  let username = "";
  let password = "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    username = body.username || "";
    password = body.password || "";
  } else {
    const form = await req.formData();
    username = String(form.get("username") || "");
    password = String(form.get("password") || "");
  }

  if (username !== env.adminUsername || password !== env.adminPassword) {
    if (wantsJson) {
      return NextResponse.json({ message: "Username atau password salah" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login?error=invalid_credentials", req.url));
  }

  const token = await createSessionToken("admin-local", username);
  const res = wantsJson
    ? NextResponse.json({ ok: true, redirectTo: "/dashboard" })
    : NextResponse.redirect(new URL("/dashboard", req.url));

  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  });

  return res;
}
