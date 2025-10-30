"use client";
import { useState } from "react";
import AuthModal from "../components/AuthModal";

export default function HomePage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-16">
      <section className="text-center py-6">
        <p className="inline-flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-full px-3 py-1">
          <SparkleIcon /> New: AI auto-apply + company interview hubs
        </p>
        <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
          Launch your career with
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> InternTrack</span>
        </h1>
        <p className="mt-5 text-gray-600 max-w-2xl mx-auto">
          Find roles faster, apply automatically with AI, and prepare for interviews in company-specific hubs—all in one place.
        </p>
        <div className="mt-7 flex justify-center gap-4">
          <button className="px-5 py-2.5 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition" onClick={() => setOpen(true)}>Get started free</button>
          <a className="px-5 py-2.5 rounded-lg border border-gray-300 hover:border-gray-400 transition" href="/prep">Start prep</a>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Feature
          title="Smart search"
          desc="Filter by role, skills, location, and more to discover the right opportunities."
          icon={<SearchIcon />} />
        <Feature
          title="AI auto-apply"
          desc="Scan matching roles and apply automatically using tailored materials you control."
          icon={<RobotIcon />} />
        <Feature
          title="Interview prep"
          desc="Company hubs, mock interviews, coding practice, and readiness scoring."
          icon={<LightningIcon />} />
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Step index={1} title="Set preferences" desc="Import your resume, choose roles, locations, and companies." />
        <Step index={2} title="Discover & auto-apply" desc="Browse opportunities while the agent applies to matches for you." />
        <Step index={3} title="Prep and track" desc="Use company hubs, schedule mocks, and manage everything in the tracker." />
      </section>

      <AuthModal open={open} setOpen={setOpen} />
    </div>
  );
}

function Feature({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-lg">{title}</h3>
      <p className="text-gray-600 mt-2 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ index, title, desc }: { index: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="text-xs font-bold text-blue-700">Step {index}</div>
      <h4 className="mt-2 font-semibold">{title}</h4>
      <p className="text-gray-600 mt-2 text-sm">{desc}</p>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M12 2l1.9 4.8L19 8.7l-4.2 3.2L15.7 17 12 14.7 8.3 17l.9-5.1L5 8.7l5.1-1.9L12 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RobotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <circle cx="8" cy="13" r="1" />
      <circle cx="16" cy="13" r="1" />
      <path d="M12 3v4" />
    </svg>
  );
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

