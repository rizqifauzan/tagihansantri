import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    expires: new Date(0),
    path: "/",
  });
  return res;
}
