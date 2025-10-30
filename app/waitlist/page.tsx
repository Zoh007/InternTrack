"use client";

import { useState } from "react";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Something went wrong");
      }
      setMessage("You're on the waitlist! We'll be in touch soon.");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="mx-auto max-w-3xl px-6 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            InternTrack Waitlist
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Auto-apply agent, company prep hubs, and a smarter tracker. Join the
            early list to get access first.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              aria-label="Email address"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 font-medium text-white shadow-sm transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Joining…" : "Join the Waitlist"}
            </button>
          </div>
          {message && (
            <p className="mt-3 text-sm text-green-700" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </form>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard title="Auto-Apply Agent" detail="Opt-in agent scans jobs and submits with transparency." />
          <FeatureCard title="Company Prep Hubs" detail="Amazon/Google/Meta pages with curated questions and flow." />
          <FeatureCard title="Tracker + Reminders" detail="Kanban pipeline, notes, and calendar export." />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm text-gray-600">{detail}</p>
    </div>
  );
}


