"use client";

import { useMemo, useState } from "react";

type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
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
  const [rows, setRows] = useState(leads);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const roles = useMemo(() => {
    return Array.from(new Set(rows.map((item) => item.role))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((item) => {
      const roleOk = role === "all" || item.role === role;
      if (!roleOk) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q)
      );
    });
  }, [rows, query, role]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filtered.some((item) => item.id === id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map((item) => item.id)])));
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function deleteByIds(ids: string[]) {
    if (!ids.length) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/maang-leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setError(payload.error || "Delete failed.");
        return;
      }

      setRows((prev) => prev.filter((row) => !ids.includes(row.id)));
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } catch {
      setError("Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleExport() {
    const rows = [
      ["Name", "Email", "Phone", "Country", "Role", "Source", "Created At (ISO)"],
      ...filtered.map((item) => [
        item.name,
        item.email,
        item.phone,
        item.country,
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
          placeholder="Search name, email, phone, country"
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
        <button
          type="button"
          disabled={busy || selectedIds.length === 0}
          onClick={() => deleteByIds(selectedIds)}
          className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Delete Selected ({selectedIds.length})
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-400">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllFiltered}
                />
              </th>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Phone</th>
              <th className="px-4 py-3 text-left font-semibold">Country</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
              <th className="px-4 py-3 text-left font-semibold">Source</th>
              <th className="px-4 py-3 text-left font-semibold">Created At</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelectOne(item.id)}
                  />
                </td>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3">{item.email}</td>
                <td className="px-4 py-3">{item.phone}</td>
                <td className="px-4 py-3">{item.country}</td>
                <td className="px-4 py-3">{item.role}</td>
                <td className="px-4 py-3">{item.source ?? "-"}</td>
                <td className="px-4 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => deleteByIds([item.id])}
                    className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
