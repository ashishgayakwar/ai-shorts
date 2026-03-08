"use client";

import { useMemo, useState } from "react";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
};

type Props = {
  users: UserRow[];
};

function toCsvValue(value: string): string {
  const withFormulaGuard = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${withFormulaGuard.replace(/"/g, '""')}"`;
}

function exportCsv(rows: string[][], filename: string) {
  const csv = rows.map((row) => row.map((cell) => toCsvValue(cell)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function UsersTable({ users }: Props) {
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("all");

  const domains = useMemo(() => {
    const values = users
      .map((item) => item.email?.split("@")[1]?.toLowerCase())
      .filter((v): v is string => Boolean(v));
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((item) => {
      const name = (item.name || "").toLowerCase();
      const email = (item.email || "").toLowerCase();
      const userDomain = email.includes("@") ? email.split("@")[1] : "";
      const domainOk = domain === "all" || userDomain === domain;
      if (!domainOk) return false;
      if (!q) return true;
      return name.includes(q) || email.includes(q);
    });
  }, [users, query, domain]);

  function handleExport() {
    const rows = [
      ["Name", "Email", "Email Domain", "Joined At (ISO)"],
      ...filtered.map((item) => {
        const email = item.email || "";
        const emailDomain = email.includes("@") ? email.split("@")[1] : "";
        return [item.name || "Unnamed", email || "No email", emailDomain, item.createdAt];
      }),
    ];
    exportCsv(rows, "users.csv");
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All domains</option>
          {domains.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm font-semibold transition hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          Export CSV ({filtered.length})
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Domain</th>
              <th className="px-4 py-3 text-left font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const email = item.email || "";
              const emailDomain = email.includes("@") ? email.split("@")[1] : "-";
              return (
                <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="px-4 py-3">{item.name || "Unnamed"}</td>
                  <td className="px-4 py-3">{item.email || "No email"}</td>
                  <td className="px-4 py-3">{emailDomain}</td>
                  <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
