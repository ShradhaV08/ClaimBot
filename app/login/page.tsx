"use client";

import { useState } from "react";
import { apiErrorMessage } from "@/lib/claims-ui";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiErrorMessage(payload, "Login failed. Please try again."));
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Enter team passcode</h1>
        <p className="mt-1 text-sm text-slate-500">This keeps your app and your Gemini quota safe.</p>
        <label htmlFor="passcode" className="sr-only">
          Team passcode
        </label>
        <input
          id="passcode"
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
          placeholder="Passcode"
          autoFocus
        />
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading || !passcode}
          className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Checking..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
