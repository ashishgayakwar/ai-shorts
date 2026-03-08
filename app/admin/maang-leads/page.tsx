import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import LeadsTable from "./LeadsTable";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MaangLeadsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/admin/maang-leads");
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(session.user.email.toLowerCase())) {
    redirect("/");
  }

  const leads = await prisma.maangLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">MAANG Leads</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {leads.length} total captured leads
            </p>
          </div>
          <Link
            href="/admin/users"
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            View Users
          </Link>
        </div>

        <LeadsTable
          leads={leads.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
