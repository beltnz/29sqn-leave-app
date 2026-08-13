"use client";

import React, { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { submitFeedback } from "@/app/actions";
import { DEFAULT_RANKS } from "@/lib/validations";
import { MessageSquare, Send, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  ranks?: string[];
}

export default function FeedbackModal({ isOpen, onClose, ranks = DEFAULT_RANKS }: FeedbackModalProps) {
  const ranksList = ranks && ranks.length > 0 ? ranks : DEFAULT_RANKS;
  const [rank, setRank] = useState<string>(ranksList[0] || "CDT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hpValue, setHpValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await submitFeedback({
        rank,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        website_hp: hpValue,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Thank you for your feedback!");
        setName("");
        setEmail("");
        setMessage("");
        setRank("CDT");
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 3000);
      } else {
        setErrorMsg(res.error || "Failed to send message. Please try again.");
      }
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg my-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-5 text-left animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-900">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
                Send Feedback &amp; Support Message
              </h2>
              <span className="text-xs text-purple-700 dark:text-purple-400 font-semibold">
                Direct to Web Development Team
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Introductory Text */}
        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-purple-50/60 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/40">
          You can use this form to send messages to the team that created this web app. You can ask questions. You can report what you think are bugs. If you are from another unit and you are interested in having this for your unit, ask.
        </p>

        {/* Status Alerts */}
        {successMsg && (
          <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-xs font-medium text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hidden Honeypot Anti-Bot Field */}
          <div className="hidden aria-hidden" aria-hidden="true" style={{ display: "none" }}>
            <input
              type="text"
              name="website_hp"
              tabIndex={-1}
              autoComplete="off"
              value={hpValue}
              onChange={(e) => setHpValue(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Rank
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {ranksList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Name / Surname <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. user@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Type your question, bug report, feedback, or unit inquiry..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white p-3 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
