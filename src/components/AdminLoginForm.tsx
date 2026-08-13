"use client";

import { useState, useEffect, useTransition } from "react";
import { loginAdmin } from "@/app/actions";
import { Shield, KeyRound, User, Loader2, AlertCircle } from "lucide-react";

export default function AdminLoginForm({ portalTitle = "Portal Access" }: { portalTitle?: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("session_expired=true")) {
      setErrorMsg("Your session has expired due to inactivity. Please log in again.");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    setErrorMsg("");
    startTransition(async () => {
      const res = await loginAdmin({
        username: username.trim(),
        password,
        clientIp: "127.0.0.1",
      });

      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Authentication failed.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-md py-12 px-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {portalTitle}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Enter your email username (e.g. jason.bourne) and password.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-lg bg-rose-50 p-3.5 text-xs font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Username (Email Handle)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="e.g. jason.bourne"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <KeyRound className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder=""
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
              </>
            ) : (
              "Authenticate"
            )}
          </button>
        </form>

        <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800 text-center">
          <p className="text-[11px] text-zinc-400">
            You have limited attempts. If locked out, contact Admin in person to be unlocked.
          </p>
        </div>
      </div>
    </div>
  );
}
