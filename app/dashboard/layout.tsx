import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { env } from "@/lib/env";
import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
