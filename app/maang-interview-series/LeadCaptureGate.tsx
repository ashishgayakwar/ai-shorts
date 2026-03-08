"use client";

import { useState } from "react";

import MaangLeadForm from "./MaangLeadForm";

export default function LeadCaptureGate() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-full border border-cyan-200/45 bg-cyan-300/15 px-6 py-3 text-base font-semibold text-cyan-50 transition hover:bg-cyan-300/25"
        >
          Download PDF
        </button>
      ) : null}

      {open ? (
        <div className="mt-5 rounded-2xl border border-white/15 bg-black/25 p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-300">Enter your details to access the PDF download.</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>
          <MaangLeadForm />
        </div>
      ) : null}
    </div>
  );
}
