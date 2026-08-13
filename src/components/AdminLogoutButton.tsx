"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { logoutAdmin, getPortalSession } from "@/app/actions";
import { LogOut, Loader2 } from "lucide-react";
import Tooltip from "@/components/Tooltip";

export default function AdminLogoutButton() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/adjutant")) {
      getPortalSession().then((res) => {
        if (isMounted) {
          setIsAuthenticated(!!res.authenticated);
        }
      });
    } else {
      setIsAuthenticated(false);
    }
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  if ((!pathname?.startsWith("/admin") && !pathname?.startsWith("/adjutant")) || !isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAdmin();
      window.location.href = pathname || "/";
    });
  };

  return (
    <Tooltip content="Log out of Portal">
      <button
        onClick={handleLogout}
        disabled={isPending}
        aria-label="Log out of Portal"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 dark:hover:text-rose-200 transition-all shadow-xs cursor-pointer"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <LogOut className="h-4 w-4 shrink-0 hover:translate-x-0.5 transition-transform" />
        )}
      </button>
    </Tooltip>
  );
}

