"use client";
import { signIn, signOut, useSession } from "next-auth/react";

export default function HeaderAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-gray-400">…</span>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{session.user?.name || "Signed in"}</span>
        <button onClick={() => signOut()} className="text-sm rounded border px-3 py-1 hover:bg-gray-50">Sign out</button>
      </div>
    );
  }

  return (
    <button onClick={() => signIn("google")} className="text-sm rounded bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Sign in with Google</button>
  );
}



