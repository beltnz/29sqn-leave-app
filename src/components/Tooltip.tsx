"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: React.ReactNode | string;
  children: React.ReactNode;
  delay?: number;
  align?: "auto" | "left" | "right" | "center";
}

export default function Tooltip({ content, children, delay = 150, align = "auto" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; arrowLeft: number; position: "top" | "bottom" }>({
    top: 0,
    left: 0,
    arrowLeft: 0,
    position: "top",
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useLayoutEffect(() => {
    if (!visible || !tooltipRef.current || !containerRef.current) return;

    const triggerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;

    // Find parent panel container element (.rounded-xl)
    const panelEl = containerRef.current.closest(".rounded-xl") || containerRef.current.closest("[data-panel]");
    const panelRect = panelEl
      ? panelEl.getBoundingClientRect()
      : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };

    const triggerCenter = triggerRect.left + triggerRect.width / 2;

    let targetLeft = triggerCenter - tooltipRect.width / 2;
    if (align === "left") {
      targetLeft = triggerRect.left;
    } else if (align === "right") {
      targetLeft = triggerRect.right - tooltipRect.width;
    }

    // Double clamp targetLeft strictly between panel container bounds AND viewport bounds
    const minLeft = Math.max(padding, panelRect.left + padding);
    const maxLeft = Math.min(
      window.innerWidth - padding - tooltipRect.width,
      panelRect.right - padding - tooltipRect.width
    );

    if (maxLeft >= minLeft) {
      targetLeft = Math.max(minLeft, Math.min(maxLeft, targetLeft));
    } else {
      targetLeft = minLeft;
    }

    // Vertical placement: default above trigger
    let targetTop = triggerRect.top - tooltipRect.height - 6;
    let pos: "top" | "bottom" = "top";
    const minTop = Math.max(padding, panelRect.top + padding);

    // If flipping or sticking off top of panel/viewport
    if (targetTop < minTop) {
      targetTop = triggerRect.bottom + 6;
      pos = "bottom";
    }

    // Clamp arrow position relative to tooltip box to point directly to trigger center
    const arrowLeft = Math.max(10, Math.min(tooltipRect.width - 10, triggerCenter - targetLeft));

    setCoords({
      top: targetTop,
      left: targetLeft,
      arrowLeft,
      position: pos,
    });
  }, [visible, align, content]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible &&
        mounted &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className="px-3 py-2 text-[11px] font-medium text-zinc-100 dark:text-zinc-100 bg-zinc-900/95 dark:bg-zinc-800/95 border border-zinc-700/80 rounded-lg shadow-2xl backdrop-blur-xs whitespace-pre-line leading-relaxed animate-in fade-in zoom-in-95 duration-100 pointer-events-none text-left"
          >
            {content}
            {/* Tooltip Arrow */}
            <div
              style={{ left: `${coords.arrowLeft}px` }}
              className={`absolute -translate-x-1/2 border-4 border-transparent ${
                coords.position === "top"
                  ? "top-full -mt-1 border-t-zinc-900 dark:border-t-zinc-800"
                  : "bottom-full -mb-1 border-b-zinc-900 dark:border-b-zinc-800"
              }`}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
