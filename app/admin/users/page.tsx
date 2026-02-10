import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/admin/users");
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(session.user.email.toLowerCase())) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {users.length} total
        </p>

        <div className="mt-6 space-y-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="text-sm font-semibold">{u.name || "Unnamed"}</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">{u.email || "No email"}</div>
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                Joined {new Date(u.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {users.length === 0 ? (
            <div className="text-sm text-zinc-500">No users yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
