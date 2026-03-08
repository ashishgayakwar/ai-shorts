"use client";

import { useMemo, useState } from "react";

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  source: string | null;
  createdAt: string;
};

type Props = {
  leads: LeadRow[];
};

function toCsvValue(value: string): string {
  const withFormulaGuard = /^[=+\-@]/.test(value) ? `'${value}` : value;
  const escaped = withFormulaGuard.replace(/"/g, '""');
  return `"${escaped}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
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

export default function LeadsTable({ leads }: Props) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");

  const roles = useMemo(() => {
    return Array.from(new Set(leads.map((item) => item.role))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((item) => {
      const roleOk = role === "all" || item.role === role;
      if (!roleOk) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q)
      );
    });
  }, [leads, query, role]);

  function handleExport() {
    const rows = [
      ["Name", "Email", "Phone", "Role", "Source", "Created At (ISO)"],
      ...filtered.map((item) => [
        item.name,
        item.email,
        item.phone,
        item.role,
        item.source ?? "",
        item.createdAt,
      ]),
    ];
    downloadCsv("maang-leads.csv", rows);
  }

  return (
    <div className="mt-6">
      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone"
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="all">All roles</option>
          {roles.map((item) => (
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
              <th className="px-4 py-3 text-left font-semibold">Phone</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
              <th className="px-4 py-3 text-left font-semibold">Source</th>
              <th className="px-4 py-3 text-left font-semibold">Created At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item.phone}</td>
                <td className="px-4 py-3">{item.role}</td>
                <td className="px-4 py-3">{item.source ?? "-"}</td>
                <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
