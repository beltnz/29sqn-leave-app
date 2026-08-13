"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Users, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import HelpTrigger from "@/components/HelpTrigger";

const navItems = [
  { name: "Apply for Leave", href: "/", icon: Calendar },
  { name: "Adjutant", href: "/adjutant", icon: Users },
  { name: "Admin", href: "/admin", icon: Shield },
];

export default function Navbar({ unitName = "29 Squadron" }: { unitName?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-950 flex items-center justify-center">
            <img
              src="/emblem.jpg"
              alt={`${unitName} Emblem`}
              className="h-full w-full object-cover"
            />
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
            {unitName} Leave Portal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 font-semibold"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="pl-2 border-l border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
            <AdminLogoutButton />
            <ThemeToggle />
            <HelpTrigger helpKey="app_overview" tooltipText="System Overview & Guide" />
          </div>
        </div>
      </div>
    </header>
  );
}
