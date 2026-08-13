"use client";

import { useEffect, useRef } from "react";
import { logoutAdmin } from "@/app/actions";

export default function AdminInactivityGuard({
  timeoutSeconds = 600,
}: {
  timeoutSeconds?: number;
}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timeoutMs = (timeoutSeconds > 0 ? timeoutSeconds : 600) * 1000;

    const handleLogout = async () => {
      console.warn(`Session expired: No user activity detected for ${timeoutSeconds} seconds.`);
      await logoutAdmin("inactivity");
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
      window.location.href = `${currentPath}?session_expired=true`;
    };

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(handleLogout, timeoutMs);
    };

    // User activity listeners for typed or clicked activity
    const events = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
      "mousedown",
      "pointerdown",
    ];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [timeoutSeconds]);

  return null;
}

