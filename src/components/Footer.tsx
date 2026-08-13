"use client";

import React, { useState } from "react";
import FeedbackModal from "@/components/FeedbackModal";
import { APP_VERSION } from "@/lib/config";

export default function Footer({ ranks }: { ranks?: string[] }) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <>
      <footer className="mt-auto w-full border-t border-zinc-200/60 bg-zinc-50/50 py-4 text-center dark:border-zinc-800/60 dark:bg-zinc-950/50">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
          <span>Unit Leave Portal</span>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            className="text-[11px] font-medium text-zinc-500 hover:text-purple-600 dark:text-zinc-400 dark:hover:text-purple-300 transition-colors cursor-pointer underline underline-offset-2"
          >
            Feedback
          </button>
          <span>&bull;</span>
          <span>ver {APP_VERSION}</span>
        </div>
      </footer>

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        ranks={ranks}
      />
    </>
  );
}
