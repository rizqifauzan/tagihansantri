import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Bayar Batch V4",
  description: "Input nominal dibayar per tagihan dalam batch",
};

export default async function TagihanV4Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell appName={env.appName} username={session.username}>
      {children}
    </DashboardShell>
  );
}
