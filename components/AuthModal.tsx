"use client";

type AuthModalProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function AuthModal({ open, setOpen }: AuthModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sign in to InternTrack</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Authentication wiring can use NextAuth (Google/Microsoft). For now, this modal is a placeholder.
        </p>
        <div className="mt-5 grid gap-3">
          <button
            className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-white hover:opacity-95"
            onClick={() => setOpen(false)}
          >
            Continue
          </button>
          <button
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 hover:bg-gray-50"
            onClick={() => setOpen(false)}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}


