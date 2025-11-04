"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AuthModal from "../components/AuthModal";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  
  // Waitlist form state
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
        const errorMsg = data?.details 
          ? `${data.error}: ${data.details}` 
          : data?.error || "Something went wrong";
        throw new Error(errorMsg);
      }
      setMessage("You're on the waitlist! We'll be in touch soon.");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Only redirect logged-in users if they explicitly want to access the app
  // Don't auto-redirect, let them see the landing page first
  // useEffect(() => {
  //   const checkUserAndRedirect = async () => {
  //     if (status === "loading") return;
  //     if (session?.user?.email) {
  //       try {
  //         const response = await fetch("/api/user/check");
  //         if (response.ok) {
  //           const data = await response.json();
  //           if (data.exists) {
  //             router.push("/apply");
  //             return;
  //           }
  //         }
  //       } catch (error) {
  //         console.error("Failed to check user:", error);
  //       }
  //     }
  //   };
  //   checkUserAndRedirect();
  // }, [session, status, router]);

  // Show landing page immediately - no loading state for public access
  return (
    <div className="grid gap-16">
      {/* Landing page content */}
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
        {/* <div className="mt-7 flex justify-center gap-3">
          {session ? (
            <>
              <button 
                className="px-5 py-2.5 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition" 
                onClick={() => router.push("/apply")}
              >
                Go to Dashboard
              </button>
              <button 
                className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition" 
                onClick={() => setOpen(true)}
              >
                Account
              </button>
            </>
          ) : (
            <button 
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white shadow hover:bg-blue-700 transition" 
              onClick={() => setOpen(true)}
            >
              Get started free
            </button>
          )}
        </div> */}
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
          title="Application tracker"
          desc="Track your applications with a Kanban board: Saved → Applied → Interview → Offer → Rejected."
          icon={<TrackerIcon />} />
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <Feature
          title="Interview prep"
          desc="Company hubs, coding practice with 200+ questions, and behavioral builder with STAR stories."
          icon={<LightningIcon />} />
        <Feature
          title="Readiness scoring"
          desc="Get personalized readiness scores per company/role with skill diagnostics and auto prep plans."
          icon={<ChartIcon />} />
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <Step index={1} title="Set preferences" desc="Import your resume, choose roles, locations, and companies." />
        <Step index={2} title="Discover & auto-apply" desc="Browse opportunities while the agent applies to matches for you." />
        <Step index={3} title="Prep and track" desc="Use company hubs, schedule mocks, and manage everything in the tracker." />
      </section>

      {/* Waitlist form */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold mb-4">Join the Waitlist</h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Be among the first to experience InternTrack when we launch.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 max-w-xl mx-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email to join the waitlist"
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
      </section>

      <AuthModal open={open} setOpen={setOpen} />
    </div>
  );
}

// Helper components
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

function TrackerIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

