"use client";

import { FormEvent, useMemo, useState } from "react";

const ROLES = [
  "Product Manager",
  "Associate Product Manager",
  "Technical Program Manager",
  "Software Engineer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "AI Engineer",
  "Solutions Architect",
  "UX Designer",
  "Product Designer",
  "Sales Manager",
  "Marketing Manager",
  "Growth Manager",
  "Business Analyst",
  "Other",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export default function MaangLeadForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const phoneDigits = useMemo(() => normalizePhone(phone), [phone]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!EMAIL_RE.test(email.trim())) {
      setError("Please enter a valid email.");
      return;
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      setError("Please enter a valid mobile number.");
      return;
    }

    if (!role) {
      setError("Please select your role.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/maang-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phoneDigits,
          email: email.trim(),
          role,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        downloadUrl?: string;
      };
      if (!response.ok || !payload.ok) {
        setError(payload.error || "Unable to submit details. Please try again.");
        return;
      }

      setSuccess(true);
      window.location.href = payload.downloadUrl || "/api/maang-download";
    } catch {
      setError("Unable to submit details. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 sm:col-span-1">
        <span className="text-sm font-medium text-slate-200">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          placeholder="Your full name"
          className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/55"
        />
      </label>

      <label className="grid gap-2 sm:col-span-1">
        <span className="text-sm font-medium text-slate-200">Mobile Number</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          inputMode="tel"
          placeholder="e.g. 9876543210"
          className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/55"
        />
      </label>

      <label className="grid gap-2 sm:col-span-1">
        <span className="text-sm font-medium text-slate-200">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          type="email"
          maxLength={255}
          placeholder="you@company.com"
          className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/55"
        />
      </label>

      <label className="grid gap-2 sm:col-span-1">
        <span className="text-sm font-medium text-slate-200">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/55"
        >
          <option value="">Select your role</option>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className="sm:col-span-2">
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-300">Success. Starting your download...</p> : null}
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-full border border-cyan-200/45 bg-cyan-300/15 px-6 py-3 text-base font-semibold text-cyan-50 transition hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit & Download PDF"}
        </button>
      </div>
    </form>
  );
}
