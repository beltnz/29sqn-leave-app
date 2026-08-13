"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  title = "Delete?",
  message = "Are you sure you want to delete this record? This action cannot be undone.",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 space-y-4 text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">{title}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
