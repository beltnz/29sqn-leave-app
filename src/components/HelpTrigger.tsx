"use client";

import React, { useState } from "react";
import HelpModal from "./HelpModal";
import Tooltip from "./Tooltip";
import { HelpCircle } from "lucide-react";

interface HelpTriggerProps {
  helpKey: string;
  tooltipText?: string;
  label?: string;
  className?: string;
}

export default function HelpTrigger({
  helpKey,
  tooltipText = "Help & Guidance",
  label,
  className = "",
}: HelpTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Tooltip content={tooltipText} delay={200}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100/90 px-2 py-0.5 text-xs font-semibold text-zinc-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-zinc-700/80 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300 transition-all cursor-pointer shadow-2xs shrink-0 ${className}`}
          aria-label={`Open help for ${helpKey}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {label && <span className="text-[11px] font-medium">{label}</span>}
        </button>
      </Tooltip>

      <HelpModal isOpen={isOpen} helpKey={helpKey} onClose={() => setIsOpen(false)} />
    </>
  );
}
